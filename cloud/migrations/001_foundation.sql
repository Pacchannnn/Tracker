-- Batch 1, protocol 1 / portable payload schema 8. Run ONCE as migration admin.
-- Requires Supabase auth.users; isolated tests supply synthetic auth.users.
-- Never expose tracker_sync through PostgREST. The server verifies JWT issuer,
-- audience, expiry and UID before calling these helpers with bound parameters.
-- Role login/secret provisioning is a separately approved operator action.
-- Rollback: disable gateway writes, preserve/export data, restore reviewed backup
-- or apply a forward migration. This file intentionally supplies no destructive
-- live downgrade, record purge, retention job, photo table or automatic import.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_sync_owner') THEN
    CREATE ROLE tracker_sync_owner NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_gateway') THEN
    CREATE ROLE tracker_gateway NOLOGIN NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('tracker_sync_owner','tracker_gateway')
    AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
    RAISE EXCEPTION 'unsafe preexisting tracker role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_sync_owner' AND rolcanlogin)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.member
      WHERE r.rolname IN ('tracker_sync_owner','tracker_gateway')) THEN
    RAISE EXCEPTION 'tracker helper must be NOLOGIN and tracker roles must not inherit other roles';
  END IF;
END $$;
CREATE SCHEMA tracker_sync;
REVOKE ALL ON SCHEMA tracker_sync FROM PUBLIC;
GRANT USAGE ON SCHEMA tracker_sync TO tracker_sync_owner, tracker_gateway;
ALTER DEFAULT PRIVILEGES IN SCHEMA tracker_sync REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE tracker_sync.sync_accounts (
  user_id uuid NOT NULL REFERENCES auth.users(id), environment text NOT NULL,
  project_id text NOT NULL, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleting')),
  head_seq bigint NOT NULL DEFAULT 0 CHECK (head_seq >= 0),
  min_available_seq bigint NOT NULL DEFAULT 0 CHECK (min_available_seq BETWEEN 0 AND head_seq),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (user_id,environment,project_id),
  CHECK (environment IN ('test','preview','production')), CHECK (length(project_id) BETWEEN 1 AND 128)
);
CREATE TABLE tracker_sync.sync_devices (
  user_id uuid NOT NULL, environment text NOT NULL, project_id text NOT NULL, device_id uuid NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(), disabled_at timestamptz,
  PRIMARY KEY(user_id,environment,project_id,device_id),
  FOREIGN KEY(user_id,environment,project_id) REFERENCES tracker_sync.sync_accounts
);
CREATE TABLE tracker_sync.sync_operations (
  user_id uuid NOT NULL, environment text NOT NULL, project_id text NOT NULL, operation_id uuid NOT NULL,
  device_id uuid NOT NULL, fingerprint text NOT NULL CHECK(length(fingerprint) BETWEEN 1 AND 128),
  terminal_status text NOT NULL CHECK (terminal_status IN ('applied','conflict','rejected')),
  commit_seq bigint, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY(user_id,environment,project_id,operation_id),
  FOREIGN KEY(user_id,environment,project_id,device_id) REFERENCES tracker_sync.sync_devices,
  CHECK ((terminal_status='applied' AND commit_seq>0) OR (terminal_status<>'applied' AND commit_seq IS NULL)),
  UNIQUE(user_id,environment,project_id,commit_seq)
);
CREATE TABLE tracker_sync.sync_records (
  user_id uuid NOT NULL, environment text NOT NULL, project_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('workout','history_candidate','planning_draft','plan','exercise','food',
    'meal_entry','saved_meal','recipe','journal','checkin','cardio','knee','account_settings','exercise_note')),
  record_id text NOT NULL CHECK(length(record_id) BETWEEN 1 AND 512), revision bigint NOT NULL CHECK(revision>0),
  last_seq bigint NOT NULL CHECK(last_seq>0), position bigint NOT NULL CHECK(position>=0),
  payload_schema integer NOT NULL CHECK(payload_schema=8), payload jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(payload)='object'),
  phase text CHECK(phase IN ('live','completed')), device_id uuid, source_session_id text,
  local_date date, deleted_at timestamptz,
  PRIMARY KEY(user_id,environment,project_id,kind,record_id),
  FOREIGN KEY(user_id,environment,project_id) REFERENCES tracker_sync.sync_accounts,
  FOREIGN KEY(user_id,environment,project_id,device_id) REFERENCES tracker_sync.sync_devices,
  CHECK ((kind IN ('history_candidate','planning_draft')) = (device_id IS NOT NULL)),
  CHECK ((kind='workout') = (phase IS NOT NULL)),
  CHECK (kind<>'journal' OR local_date IS NOT NULL),
  CHECK (kind<>'account_settings' OR record_id='default')
);
CREATE UNIQUE INDEX journal_live_date ON tracker_sync.sync_records(user_id,environment,project_id,local_date)
  WHERE kind='journal' AND deleted_at IS NULL;
CREATE INDEX records_order ON tracker_sync.sync_records(user_id,environment,project_id,kind,position,record_id);
CREATE TABLE tracker_sync.sync_record_versions (
  user_id uuid NOT NULL, environment text NOT NULL, project_id text NOT NULL,
  kind text NOT NULL, record_id text NOT NULL, revision bigint NOT NULL CHECK(revision>0),
  commit_seq bigint NOT NULL CHECK(commit_seq>0), ordinal integer NOT NULL CHECK(ordinal>=0),
  operation_id uuid NOT NULL, envelope jsonb NOT NULL,
  PRIMARY KEY(user_id,environment,project_id,kind,record_id,revision),
  UNIQUE(user_id,environment,project_id,commit_seq,ordinal),
  FOREIGN KEY(user_id,environment,project_id,kind,record_id) REFERENCES tracker_sync.sync_records,
  FOREIGN KEY(user_id,environment,project_id,operation_id) REFERENCES tracker_sync.sync_operations DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX versions_feed ON tracker_sync.sync_record_versions(user_id,environment,project_id,commit_seq,ordinal);
CREATE INDEX versions_snapshot ON tracker_sync.sync_record_versions(user_id,environment,project_id,kind,record_id,commit_seq DESC);
CREATE TABLE tracker_sync.sync_migration_ledger (
  user_id uuid NOT NULL, environment text NOT NULL, project_id text NOT NULL, import_id uuid NOT NULL,
  device_id uuid NOT NULL, source_workspace_hash text NOT NULL, manifest jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('reviewed','in_progress','complete','blocked')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY(user_id,environment,project_id,import_id),
  FOREIGN KEY(user_id,environment,project_id,device_id) REFERENCES tracker_sync.sync_devices
);

-- No browser rights, even if browser can set a similarly named custom GUC.
DO $$ DECLARE t text; r text; BEGIN
  FOREACH t IN ARRAY ARRAY['sync_accounts','sync_devices','sync_operations','sync_records','sync_record_versions','sync_migration_ledger'] LOOP
    EXECUTE pg_catalog.format('ALTER TABLE tracker_sync.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE pg_catalog.format('ALTER TABLE tracker_sync.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE pg_catalog.format('CREATE POLICY trusted_scope ON tracker_sync.%I TO tracker_sync_owner USING
      (user_id::text = pg_catalog.current_setting(''tracker.user_id'',true)
      AND environment = pg_catalog.current_setting(''tracker.environment'',true)
      AND project_id = pg_catalog.current_setting(''tracker.project_id'',true)) WITH CHECK
      (user_id::text = pg_catalog.current_setting(''tracker.user_id'',true)
      AND environment = pg_catalog.current_setting(''tracker.environment'',true)
      AND project_id = pg_catalog.current_setting(''tracker.project_id'',true))',t);
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=r) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON SCHEMA tracker_sync FROM %I',r);
      EXECUTE pg_catalog.format('REVOKE ALL ON ALL TABLES IN SCHEMA tracker_sync FROM %I',r);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA tracker_sync FROM PUBLIC, tracker_gateway;
GRANT SELECT,INSERT,UPDATE ON tracker_sync.sync_accounts,tracker_sync.sync_devices,tracker_sync.sync_records TO tracker_sync_owner;
GRANT SELECT,INSERT ON tracker_sync.sync_operations,tracker_sync.sync_record_versions,tracker_sync.sync_migration_ledger TO tracker_sync_owner;

CREATE FUNCTION tracker_sync.set_scope(p_uid uuid,p_env text,p_project text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  IF p_uid IS NULL OR p_env IS NULL OR p_env NOT IN ('test','preview','production') OR p_project IS NULL OR length(p_project) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='invalid_scope';
  END IF;
  PERFORM pg_catalog.set_config('tracker.user_id',p_uid::text,true);
  PERFORM pg_catalog.set_config('tracker.environment',p_env,true);
  PERFORM pg_catalog.set_config('tracker.project_id',p_project,true);
END $$;
CREATE FUNCTION tracker_sync.require_account(p_uid uuid,p_env text,p_project text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE h bigint; BEGIN
  PERFORM tracker_sync.set_scope(p_uid,p_env,p_project);
  SELECT head_seq INTO h FROM tracker_sync.sync_accounts
    WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='account_unavailable'; END IF;
  RETURN h;
END $$;
CREATE FUNCTION tracker_sync.record_envelope(r tracker_sync.sync_records) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT pg_catalog.jsonb_build_object(
  'kind',r.kind,'recordId',r.record_id,'revision',r.revision::text,'commitSequence',r.last_seq::text,
  'position',r.position::text,'payloadSchema',r.payload_schema,'payload',r.payload,'phase',r.phase,
  'deviceId',r.device_id,'sourceSessionId',r.source_session_id,'deleted',r.deleted_at IS NOT NULL) $$;

CREATE FUNCTION tracker_sync.register_account_device(p_uid uuid,p_env text,p_project text,p_device uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  PERFORM tracker_sync.set_scope(p_uid,p_env,p_project);
  IF p_device IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_device'; END IF;
  INSERT INTO tracker_sync.sync_accounts(user_id,environment,project_id) VALUES(p_uid,p_env,p_project) ON CONFLICT DO NOTHING;
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  INSERT INTO tracker_sync.sync_devices(user_id,environment,project_id,device_id)
    VALUES(p_uid,p_env,p_project,p_device) ON CONFLICT DO NOTHING;
  IF EXISTS(SELECT 1 FROM tracker_sync.sync_devices WHERE user_id=p_uid AND environment=p_env AND project_id=p_project
    AND device_id=p_device AND disabled_at IS NOT NULL) THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='device_disabled'; END IF;
  RETURN pg_catalog.jsonb_build_object('registered',true,'deviceId',p_device);
END $$;
CREATE FUNCTION tracker_sync.read_state(p_uid uuid,p_env text,p_project text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE h bigint; items jsonb; BEGIN
  h := tracker_sync.require_account(p_uid,p_env,p_project);
  SELECT COALESCE(pg_catalog.jsonb_agg(tracker_sync.record_envelope(r) ORDER BY r.kind,r.position,r.record_id),'[]'::jsonb)
    INTO items FROM tracker_sync.sync_records r WHERE r.user_id=p_uid AND r.environment=p_env AND r.project_id=p_project;
  RETURN pg_catalog.jsonb_build_object('headSequence',h::text,'records',items);
END $$;
CREATE FUNCTION tracker_sync.lookup_receipt(p_uid uuid,p_env text,p_project text,p_operation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE result jsonb; BEGIN
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  SELECT o.result INTO result FROM tracker_sync.sync_operations o
    WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=p_operation;
  RETURN result;
END $$;

-- Domain validator failures have durable receipts too. Codes are deliberately
-- bounded: no payload, provider errors, JWTs or arbitrary diagnostic text.
CREATE FUNCTION tracker_sync.record_rejection(p_uid uuid,p_env text,p_project text,p_operation jsonb,
  p_fingerprint text,p_status text,p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE op uuid; dev uuid; saved tracker_sync.sync_operations; result jsonb;
BEGIN
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  IF p_status IS NULL OR p_status NOT IN ('rejected','conflict') OR p_code IS NULL OR p_code NOT IN
    ('invalid_payload','invalid_operation','unsupported_operation','unsupported_schema','invalid_domain',
     'semantic_conflict','revision_conflict','stale_validation','stale_read_set')
    OR p_fingerprint IS NULL OR length(p_fingerprint) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_rejection';
  END IF;
  op:=(p_operation->>'operationId')::uuid; dev:=(p_operation->>'deviceId')::uuid;
  IF op IS NULL OR dev IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_identity'; END IF;
  IF NOT EXISTS(SELECT 1 FROM tracker_sync.sync_devices WHERE user_id=p_uid AND environment=p_env AND project_id=p_project
    AND device_id=dev AND disabled_at IS NULL) THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='device_unavailable'; END IF;
  SELECT * INTO saved FROM tracker_sync.sync_operations WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=op;
  IF FOUND THEN
    IF saved.fingerprint<>p_fingerprint OR saved.device_id<>dev THEN
      RETURN pg_catalog.jsonb_build_object('operationId',op,'status','rejected','code','operation_id_reused');
    END IF;
    RETURN saved.result;
  END IF;
  result:=pg_catalog.jsonb_build_object('operationId',op,'status',p_status,'code',p_code);
  INSERT INTO tracker_sync.sync_operations(user_id,environment,project_id,operation_id,device_id,fingerprint,terminal_status,result)
    VALUES(p_uid,p_env,p_project,op,dev,p_fingerprint,p_status,result);
  RETURN result;
END $$;

CREATE FUNCTION tracker_sync.push(p_uid uuid,p_env text,p_project text,p_operation jsonb,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE h bigint; op uuid; dev uuid; saved tracker_sync.sync_operations; c jsonb; rs jsonb;
  old tracker_sync.sync_records; written tracker_sync.sync_records; ordinal integer:=0; pos bigint; rev bigint;
  result jsonb; envelopes jsonb:='[]'; outcome text; reason text; command text; k text; id text; action text; phase_value text;
BEGIN
  h := tracker_sync.require_account(p_uid,p_env,p_project);
  -- Malformed identifiers cannot acquire a receipt key; no writes occur.
  BEGIN op:=(p_operation->>'operationId')::uuid; dev:=(p_operation->>'deviceId')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN RETURN pg_catalog.jsonb_build_object('status','rejected','code','invalid_identity'); END;
  IF op IS NULL OR dev IS NULL OR p_fingerprint IS NULL OR length(p_fingerprint) NOT BETWEEN 1 AND 128 THEN
    RETURN pg_catalog.jsonb_build_object('status','rejected','code','invalid_identity');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM tracker_sync.sync_devices WHERE user_id=p_uid AND environment=p_env AND project_id=p_project
    AND device_id=dev AND disabled_at IS NULL) THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='device_unavailable'; END IF;
  SELECT * INTO saved FROM tracker_sync.sync_operations WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=op;
  IF FOUND THEN
    IF saved.fingerprint<>p_fingerprint OR saved.device_id<>dev THEN
      RETURN pg_catalog.jsonb_build_object('operationId',op,'status','rejected','code','operation_id_reused');
    END IF;
    RETURN saved.result;
  END IF;
  BEGIN
    command:=p_operation->>'commandType';
    IF p_operation->>'protocolVersion' IS DISTINCT FROM '1' OR command IS NULL OR command NOT IN
      ('import-records','update-records','delete-records','complete-workout','correct-history','update-planning')
      OR pg_catalog.jsonb_typeof(p_operation->'changes') IS DISTINCT FROM 'array'
      OR pg_catalog.jsonb_array_length(p_operation->'changes') NOT BETWEEN 1 AND 100
      OR pg_catalog.octet_length(p_operation::text)>2097152
      OR pg_catalog.jsonb_typeof(p_operation->'readSet') IS DISTINCT FROM 'array'
      OR p_operation->'dependencies' IS DISTINCT FROM '[]'::jsonb THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='unsupported_operation';
    END IF;
    -- Trusted gateway supplies these fields after strict schema8/domain validation.
    -- Conservatively guard whole head plus every semantic source to close TOCTOU.
    IF p_operation->>'validatedHead' IS DISTINCT FROM h::text THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='stale_validation'; END IF;
    FOR rs IN SELECT value FROM pg_catalog.jsonb_array_elements(p_operation->'readSet') LOOP
      SELECT * INTO old FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project
        AND kind=rs->>'kind' AND record_id=rs->>'recordId';
      IF (CASE WHEN FOUND THEN old.revision::text ELSE NULL END) IS DISTINCT FROM rs->>'revision' THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='stale_read_set';
      END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_operation->'changes') x
      GROUP BY x->>'kind',x->>'recordId' HAVING count(*)>1) THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='duplicate_key';
    END IF;
    IF command='correct-history' AND (pg_catalog.jsonb_array_length(p_operation->'changes')<>2 OR NOT EXISTS(
      SELECT 1 FROM pg_catalog.jsonb_array_elements(p_operation->'changes') w,
        pg_catalog.jsonb_array_elements(p_operation->'changes') d,tracker_sync.sync_records candidate,tracker_sync.sync_records source
      WHERE w->>'kind'='workout' AND w->>'action'='update' AND w->>'phase'='completed'
        AND d->>'kind'='history_candidate' AND d->>'action'='delete'
        AND candidate.user_id=p_uid AND candidate.environment=p_env AND candidate.project_id=p_project
        AND candidate.kind='history_candidate' AND candidate.record_id=d->>'recordId'
        AND candidate.device_id=dev AND candidate.deleted_at IS NULL AND candidate.source_session_id=w->>'recordId'
        AND source.user_id=p_uid AND source.environment=p_env AND source.project_id=p_project
        AND source.kind='workout' AND source.record_id=w->>'recordId' AND source.phase='completed' AND source.deleted_at IS NULL)) THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_history_correction';
    END IF;
    FOR c IN SELECT value FROM pg_catalog.jsonb_array_elements(p_operation->'changes') LOOP
      k:=c->>'kind'; id:=c->>'recordId'; action:=c->>'action'; phase_value:=c->>'phase';
      IF k IS NULL OR k NOT IN ('workout','history_candidate','planning_draft','plan','exercise','food','meal_entry','saved_meal',
        'recipe','journal','checkin','cardio','knee','account_settings','exercise_note') OR id IS NULL OR length(id) NOT BETWEEN 1 AND 512
        OR action IS NULL OR action NOT IN ('create','update','delete') OR c->>'payloadSchema' IS DISTINCT FROM '8'
        OR (action<>'delete' AND pg_catalog.jsonb_typeof(c->'payload') IS DISTINCT FROM 'object') THEN
        RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_change';
      END IF;
      IF (command='import-records' AND action<>'create') OR (command='delete-records' AND action<>'delete'
        AND NOT (k='account_settings' AND action='update' AND c->'payload'->'activePlanId' IS NOT DISTINCT FROM 'null'::jsonb))
        OR (command='update-records' AND action<>'update') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='command_action_mismatch'; END IF;
      SELECT * INTO old FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind=k AND record_id=id;
      IF action='create' THEN
        IF FOUND OR c->>'baseRevision' IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='create_collision'; END IF;
        rev:=1;
        SELECT COALESCE(max(position)+1,0) INTO pos FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind=k;
      ELSE
        IF NOT FOUND OR old.deleted_at IS NOT NULL OR c->>'baseRevision' IS DISTINCT FROM old.revision::text THEN
          RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='revision_conflict';
        END IF;
        IF old.device_id IS NOT NULL AND old.device_id<>dev THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='draft_device_mismatch'; END IF;
        rev:=old.revision+1; pos:=old.position;
      END IF;
      IF k='planning_draft' AND id<>dev::text THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='draft_device_mismatch'; END IF;
      IF k='workout' THEN
        IF action='delete' THEN phase_value:=old.phase;
        ELSIF phase_value IS NULL OR phase_value NOT IN ('live','completed') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_phase';
        ELSIF action='create' AND phase_value='completed' AND command<>'import-records' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_phase_command';
        ELSIF action='update' AND ((old.phase='completed' AND (phase_value<>'completed' OR command<>'correct-history'))
          OR (old.phase='live' AND phase_value='completed' AND command<>'complete-workout')) THEN
          RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_phase_command';
        END IF;
      ELSIF phase_value IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_phase'; END IF;
      IF k='journal' AND action<>'delete' AND
        (pg_catalog.to_char((c->'payload'->>'date')::date,'YYYY-MM-DD') IS DISTINCT FROM c->'payload'->>'date') THEN
        RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_journal_date';
      END IF;
      INSERT INTO tracker_sync.sync_records(user_id,environment,project_id,kind,record_id,revision,last_seq,position,payload_schema,payload,phase,
        device_id,source_session_id,local_date,deleted_at)
      VALUES(p_uid,p_env,p_project,k,id,rev,h+1,pos,8,CASE WHEN action='delete' THEN old.payload ELSE c->'payload' END,phase_value,
        CASE WHEN k IN ('planning_draft','history_candidate') THEN dev END,
        CASE WHEN action='delete' THEN old.source_session_id WHEN k='history_candidate' THEN c->'payload'->>'sourceSessionId' ELSE c->>'sourceSessionId' END,
        CASE WHEN action='delete' THEN old.local_date WHEN k='journal' THEN (c->'payload'->>'date')::date END,
        CASE WHEN action='delete' THEN pg_catalog.clock_timestamp() END)
      ON CONFLICT(user_id,environment,project_id,kind,record_id) DO UPDATE SET
        revision=EXCLUDED.revision,last_seq=EXCLUDED.last_seq,payload=EXCLUDED.payload,phase=EXCLUDED.phase,
        local_date=EXCLUDED.local_date,deleted_at=EXCLUDED.deleted_at,source_session_id=EXCLUDED.source_session_id
      RETURNING * INTO written;
      INSERT INTO tracker_sync.sync_record_versions(user_id,environment,project_id,kind,record_id,revision,commit_seq,ordinal,operation_id,envelope)
        VALUES(p_uid,p_env,p_project,k,id,rev,h+1,ordinal,op,tracker_sync.record_envelope(written));
      envelopes:=envelopes||pg_catalog.jsonb_build_array(tracker_sync.record_envelope(written)); ordinal:=ordinal+1;
    END LOOP;
    -- Evaluate final compound state: active plan deletion must clear settings in
    -- this operation, and choosing an absent/tombstoned plan is forbidden.
    IF EXISTS(SELECT 1 FROM tracker_sync.sync_records s WHERE s.user_id=p_uid AND s.environment=p_env AND s.project_id=p_project
      AND s.kind='account_settings' AND s.deleted_at IS NULL AND s.payload->>'activePlanId' IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM tracker_sync.sync_records p WHERE p.user_id=p_uid AND p.environment=p_env AND p.project_id=p_project
        AND p.kind='plan' AND p.record_id=s.payload->>'activePlanId' AND p.deleted_at IS NULL)) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='active_plan_conflict';
    END IF;
    UPDATE tracker_sync.sync_accounts SET head_seq=h+1 WHERE user_id=p_uid AND environment=p_env AND project_id=p_project;
    outcome:='applied'; result:=pg_catalog.jsonb_build_object('operationId',op,'status',outcome,'commitSequence',(h+1)::text,'records',envelopes);
  EXCEPTION WHEN SQLSTATE 'P0001' OR unique_violation THEN
    outcome:='conflict'; reason:=CASE WHEN SQLSTATE='23505' THEN 'journal_date_conflict' ELSE SQLERRM END;
    result:=pg_catalog.jsonb_build_object('operationId',op,'status',outcome,'code',reason);
  WHEN check_violation OR invalid_text_representation OR datetime_field_overflow OR invalid_datetime_format OR SQLSTATE '22023' OR not_null_violation THEN
    outcome:='rejected'; result:=pg_catalog.jsonb_build_object('operationId',op,'status',outcome,'code','invalid_operation');
  END;
  INSERT INTO tracker_sync.sync_operations(user_id,environment,project_id,operation_id,device_id,fingerprint,terminal_status,commit_seq,result)
    VALUES(p_uid,p_env,p_project,op,dev,p_fingerprint,outcome,CASE WHEN outcome='applied' THEN h+1 END,result);
  RETURN result;
END $$;

CREATE FUNCTION tracker_sync.pull(p_uid uuid,p_env text,p_project text,p_after text,p_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE h bigint; a bigint; groups jsonb; last_seq bigint; floor_seq bigint; BEGIN
  h:=tracker_sync.require_account(p_uid,p_env,p_project);
  IF p_after IS NULL OR p_after!~'^(0|[1-9][0-9]*)$' OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_cursor'; END IF;
  a:=p_after::bigint;
  SELECT min_available_seq INTO floor_seq FROM tracker_sync.sync_accounts WHERE user_id=p_uid AND environment=p_env AND project_id=p_project;
  IF a<floor_seq OR a>h THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='resnapshot_required'; END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(group_json ORDER BY commit_seq),'[]'::jsonb),COALESCE(max(commit_seq),a) INTO groups,last_seq
  FROM (SELECT o.commit_seq, pg_catalog.jsonb_build_object('commitSequence',o.commit_seq::text,'operationId',o.operation_id,
    'records',(SELECT pg_catalog.jsonb_agg(v.envelope ORDER BY ordinal) FROM tracker_sync.sync_record_versions v
      WHERE v.user_id=p_uid AND v.environment=p_env AND v.project_id=p_project AND v.commit_seq=o.commit_seq)) AS group_json
    FROM tracker_sync.sync_operations o WHERE o.user_id=p_uid AND o.environment=p_env AND o.project_id=p_project
      AND o.terminal_status='applied' AND o.commit_seq>a ORDER BY o.commit_seq LIMIT p_limit) q;
  RETURN pg_catalog.jsonb_build_object('headSequence',h::text,'afterSequence',last_seq::text,'groups',groups,'hasMore',last_seq<h);
END $$;
CREATE FUNCTION tracker_sync.bootstrap(p_uid uuid,p_env text,p_project text,p_head text,p_cursor jsonb,p_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE h bigint; snapshot_head bigint; records jsonb; cursor_out jsonb; more boolean; BEGIN
  h:=tracker_sync.require_account(p_uid,p_env,p_project);
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR (p_head IS NOT NULL AND p_head!~'^(0|[1-9][0-9]*)$')
    OR (p_cursor IS NOT NULL AND (pg_catalog.jsonb_typeof(p_cursor) IS DISTINCT FROM 'object'
      OR p_cursor->>'kind' IS NULL OR p_cursor->>'recordId' IS NULL OR p_head IS NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_snapshot_cursor'; END IF;
  snapshot_head:=COALESCE(p_head::bigint,h);
  IF snapshot_head>h OR snapshot_head<0 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_snapshot_head'; END IF;
  WITH latest AS (SELECT DISTINCT ON(kind,record_id) kind,record_id,envelope FROM tracker_sync.sync_record_versions
    WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND commit_seq<=snapshot_head
    ORDER BY kind,record_id,commit_seq DESC), page AS (SELECT * FROM latest
    WHERE p_cursor IS NULL OR (kind,record_id)>(p_cursor->>'kind',p_cursor->>'recordId') ORDER BY kind,record_id LIMIT p_limit+1),
    accepted AS (SELECT * FROM page ORDER BY kind,record_id LIMIT p_limit)
  SELECT COALESCE((SELECT pg_catalog.jsonb_agg(envelope ORDER BY kind,record_id) FROM accepted),'[]'::jsonb),
    (SELECT pg_catalog.jsonb_build_object('kind',kind,'recordId',record_id) FROM accepted ORDER BY kind DESC,record_id DESC LIMIT 1),
    (SELECT count(*)>p_limit FROM page) INTO records,cursor_out,more;
  RETURN pg_catalog.jsonb_build_object('headSequence',snapshot_head::text,'records',records,'cursor',CASE WHEN more THEN cursor_out END,'hasMore',more);
END $$;

-- Transfer only function ownership: table owner remains migration administrator.
-- Owner has no auth schema/table permissions; auth FK is checked by PostgreSQL.
GRANT CREATE ON SCHEMA tracker_sync TO tracker_sync_owner;
DO $$ DECLARE f record; r text; BEGIN
  FOR f IN SELECT p.oid::pg_catalog.regprocedure AS signature FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='tracker_sync' LOOP
    EXECUTE pg_catalog.format('ALTER FUNCTION %s OWNER TO tracker_sync_owner',f.signature);
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=r) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tracker_sync FROM %I',r);
    END IF;
  END LOOP;
END $$;
REVOKE CREATE ON SCHEMA tracker_sync FROM tracker_sync_owner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tracker_sync FROM PUBLIC, tracker_gateway;
GRANT EXECUTE ON FUNCTION tracker_sync.register_account_device(uuid,text,text,uuid), tracker_sync.read_state(uuid,text,text),
  tracker_sync.lookup_receipt(uuid,text,text,uuid),tracker_sync.push(uuid,text,text,jsonb,text),
  tracker_sync.record_rejection(uuid,text,text,jsonb,text,text,text),
  tracker_sync.pull(uuid,text,text,text,integer),tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer) TO tracker_gateway;
COMMIT;
