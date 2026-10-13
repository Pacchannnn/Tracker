-- Approved additive local preparation only. Apply after 001/002 as migration
-- administrator. Hosted use requires the split operator packet and a preexisting
-- private Dashboard/API bucket; see SUPABASE_HOSTED_MIGRATION_RUNBOOK.md.
-- No service_role runtime credential, overwrite, physical delete, retention or GC.
BEGIN;
ALTER TABLE tracker_sync.sync_records DROP CONSTRAINT sync_records_kind_check;
ALTER TABLE tracker_sync.sync_records ADD CONSTRAINT sync_records_kind_check CHECK(kind IN
  ('workout','history_candidate','planning_draft','plan','exercise','food','meal_entry','saved_meal','recipe','journal','checkin','cardio','knee','account_settings','exercise_note','photo'));

CREATE TABLE tracker_sync.photo_manifests (
  user_id uuid NOT NULL,environment text NOT NULL,project_id text NOT NULL,manifest_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  operation_id uuid NOT NULL,device_id uuid NOT NULL,fingerprint text NOT NULL CHECK(fingerprint~'^[0-9a-f]{64}$'),
  action text NOT NULL CHECK(action IN ('create','edit','replace','delete','delete-daily')),request jsonb NOT NULL,dates jsonb NOT NULL,
  original jsonb,thumbnail jsonb,state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','verified','finalized','closed')),
  expires_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()+interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),verified_at timestamptz,
  PRIMARY KEY(user_id,environment,project_id,manifest_id),UNIQUE(user_id,environment,project_id,operation_id),
  FOREIGN KEY(user_id,environment,project_id,device_id) REFERENCES tracker_sync.sync_devices
);
CREATE TABLE tracker_sync.photo_assets (
  user_id uuid NOT NULL,environment text NOT NULL,project_id text NOT NULL,asset_id uuid NOT NULL,manifest_id uuid NOT NULL,
  variant text NOT NULL CHECK(variant IN ('original','thumbnail')),descriptor jsonb NOT NULL,
  PRIMARY KEY(user_id,environment,project_id,asset_id),UNIQUE(user_id,environment,project_id,manifest_id,variant),
  FOREIGN KEY(user_id,environment,project_id,manifest_id) REFERENCES tracker_sync.photo_manifests
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['photo_manifests','photo_assets'] LOOP
    EXECUTE pg_catalog.format('ALTER TABLE tracker_sync.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE pg_catalog.format('ALTER TABLE tracker_sync.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE pg_catalog.format('CREATE POLICY trusted_scope ON tracker_sync.%I TO tracker_sync_owner USING
      (user_id::text=pg_catalog.current_setting(''tracker.user_id'',true) AND environment=pg_catalog.current_setting(''tracker.environment'',true)
      AND project_id=pg_catalog.current_setting(''tracker.project_id'',true)) WITH CHECK
      (user_id::text=pg_catalog.current_setting(''tracker.user_id'',true) AND environment=pg_catalog.current_setting(''tracker.environment'',true)
      AND project_id=pg_catalog.current_setting(''tracker.project_id'',true))',t);
  END LOOP;
END $$;
REVOKE ALL ON tracker_sync.photo_manifests,tracker_sync.photo_assets FROM PUBLIC,tracker_gateway;
GRANT SELECT,INSERT,UPDATE ON tracker_sync.photo_manifests TO tracker_sync_owner;
GRANT SELECT,INSERT ON tracker_sync.photo_assets TO tracker_sync_owner;

CREATE FUNCTION tracker_sync.photo_require_device(p_uid uuid,p_env text,p_project text,p_device uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  IF NOT EXISTS(SELECT 1 FROM tracker_sync.sync_devices WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND device_id=p_device AND disabled_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='device_unavailable'; END IF;
END $$;
CREATE FUNCTION tracker_sync.photo_descriptor_valid(p_asset jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT pg_catalog.jsonb_typeof(p_asset)='object'
  AND (p_asset->>'assetId')~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND (p_asset->>'sha256')~'^[0-9a-f]{64}$' AND p_asset->>'mime'='image/jpeg'
  AND (p_asset->>'bytes')~'^[1-9][0-9]*$' AND (p_asset->>'bytes')::numeric BETWEEN 4 AND 20000000
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_asset) k WHERE k NOT IN ('assetId','sha256','bytes','mime')) $$;
CREATE FUNCTION tracker_sync.photo_daily_set(p_uid uuid,p_env text,p_project text,p_dates jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
  PERFORM tracker_sync.set_scope(p_uid,p_env,p_project);
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('recordId',record_id,'revision',revision::text) ORDER BY record_id),'[]'::jsonb) INTO result
  FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind='photo' AND deleted_at IS NULL
    AND payload->>'category'='daily' AND payload->>'date' IN (SELECT value FROM pg_catalog.jsonb_array_elements_text(p_dates));
  RETURN result;
END $$;
CREATE FUNCTION tracker_sync.photo_predicate(p_uid uuid,p_env text,p_project text,p_request jsonb,p_dates jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE old tracker_sync.sync_records; expected jsonb;actual jsonb; BEGIN
  PERFORM tracker_sync.set_scope(p_uid,p_env,p_project);
  SELECT * INTO old FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project
    AND kind=CASE WHEN p_request->>'action'='delete-daily' THEN 'journal' ELSE 'photo' END AND record_id=p_request->>'recordId';
  IF p_request->>'action'='create' OR (p_request->>'action'='replace' AND p_request->>'baseRevision' IS NULL) THEN
    IF FOUND THEN RETURN 'create_collision'; END IF;
  ELSIF NOT FOUND OR old.deleted_at IS NOT NULL OR old.revision::text IS DISTINCT FROM p_request->>'baseRevision' THEN RETURN 'revision_conflict';
  END IF;
  IF p_request->>'action'='delete-daily' AND old.payload->>'date' IS DISTINCT FROM p_request->>'journalDate' THEN RETURN 'journal_date_conflict'; END IF;
  IF p_request->'metadata'->>'ownerType' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tracker_sync.sync_records WHERE
    user_id=p_uid AND environment=p_env AND project_id=p_project AND kind=p_request->'metadata'->>'ownerType'
    AND record_id=p_request->'metadata'->>'ownerId' AND deleted_at IS NULL AND revision::text=p_request->>'ownerBaseRevision') THEN RETURN 'photo_owner_conflict'; END IF;
  IF p_request->>'action'='replace' AND p_request->>'baseRevision' IS NULL THEN
    IF p_request->'metadata'->>'ownerType' IS NULL AND p_request->'metadata'->>'category' IS DISTINCT FROM 'daily' THEN RETURN 'photo_owner_conflict'; END IF;
    SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY value->>'recordId'),'[]'::jsonb) INTO expected FROM pg_catalog.jsonb_array_elements(p_request->'replacedPhotos');
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('recordId',record_id,'revision',revision::text) ORDER BY record_id),'[]'::jsonb) INTO actual
      FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind='photo' AND deleted_at IS NULL
      AND ((p_request->'metadata'->>'ownerType' IS NOT NULL AND payload->>'ownerType'=p_request->'metadata'->>'ownerType' AND payload->>'ownerId'=p_request->'metadata'->>'ownerId')
        OR (p_request->'metadata'->>'ownerType' IS NULL AND payload->>'category'='daily' AND payload->>'date'=p_request->'metadata'->>'date'));
    IF actual IS DISTINCT FROM expected THEN RETURN 'stale_owner_photo_set'; END IF;
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(value ORDER BY value->>'recordId'),'[]'::jsonb) INTO expected FROM pg_catalog.jsonb_array_elements(p_request->'dailyPhotoSet');
  IF tracker_sync.photo_daily_set(p_uid,p_env,p_project,p_dates) IS DISTINCT FROM expected THEN RETURN 'stale_daily_photo_set'; END IF;
  RETURN NULL;
END $$;
CREATE FUNCTION tracker_sync.photo_terminal(p_uid uuid,p_env text,p_project text,p_operation uuid,p_device uuid,p_fingerprint text,p_status text,p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
  result:=pg_catalog.jsonb_build_object('operationId',p_operation,'status',p_status,'code',p_code);
  INSERT INTO tracker_sync.sync_operations(user_id,environment,project_id,operation_id,device_id,fingerprint,terminal_status,result)
    VALUES(p_uid,p_env,p_project,p_operation,p_device,p_fingerprint,p_status,result);
  RETURN result;
END $$;
CREATE FUNCTION tracker_sync.photo_manifest(p_uid uuid,p_env text,p_project text,p_manifest uuid,p_device uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE m tracker_sync.photo_manifests; receipt jsonb; BEGIN
  PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,p_device);
  SELECT * INTO m FROM tracker_sync.photo_manifests WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest AND device_id=p_device;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT result INTO receipt FROM tracker_sync.sync_operations WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=m.operation_id;
  RETURN pg_catalog.jsonb_build_object('status','prepared','manifestId',m.manifest_id,'operationId',m.operation_id,'deviceId',m.device_id,'action',m.action,
    'state',m.state,'expiresAt',m.expires_at,'expired',m.expires_at<=pg_catalog.clock_timestamp(),'original',m.original,'thumbnail',m.thumbnail,'receipt',receipt);
END $$;
CREATE FUNCTION tracker_sync.photo_prepare(p_uid uuid,p_env text,p_project text,p_request jsonb,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op uuid;dev uuid;mid uuid;old tracker_sync.sync_records; saved tracker_sync.sync_operations;m tracker_sync.photo_manifests;dates jsonb;reason text;original jsonb;thumbnail jsonb;prefix text;
BEGIN
  op:=(p_request->>'operationId')::uuid;dev:=(p_request->>'deviceId')::uuid;
  PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,dev);
  IF p_request->>'protocolVersion' IS DISTINCT FROM '2' OR p_request->>'action' NOT IN ('create','edit','replace','delete','delete-daily')
    OR op IS NULL OR dev IS NULL OR p_fingerprint IS NULL OR p_fingerprint!~'^[0-9a-f]{64}$' OR p_project!~'^[a-z0-9-]{1,128}$'
    OR length(p_request->>'recordId') NOT BETWEEN 1 AND 512 OR pg_catalog.jsonb_typeof(p_request->'dailyPhotoSet') IS DISTINCT FROM 'array'
    OR pg_catalog.octet_length(p_request::text)>2097152 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_photo_operation'; END IF;
  SELECT * INTO saved FROM tracker_sync.sync_operations WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=op;
  IF FOUND THEN
    IF saved.fingerprint<>p_fingerprint OR saved.device_id<>dev THEN RETURN pg_catalog.jsonb_build_object('status','rejected','operationId',op,'code','operation_id_reused'); END IF;
    RETURN saved.result;
  END IF;
  SELECT * INTO m FROM tracker_sync.photo_manifests WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=op;
  IF FOUND THEN
    IF m.fingerprint<>p_fingerprint OR m.device_id<>dev THEN RETURN pg_catalog.jsonb_build_object('status','rejected','operationId',op,'code','operation_id_reused'); END IF;
    RETURN tracker_sync.photo_manifest(p_uid,p_env,p_project,m.manifest_id,dev);
  END IF;
  SELECT * INTO old FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project
    AND kind=CASE WHEN p_request->>'action'='delete-daily' THEN 'journal' ELSE 'photo' END AND record_id=p_request->>'recordId';
  SELECT COALESCE(pg_catalog.jsonb_agg(date_value ORDER BY date_value),'[]'::jsonb) INTO dates FROM
    (SELECT DISTINCT date_value FROM (
      SELECT date_value FROM (VALUES(CASE WHEN old.payload->>'category'='daily' THEN old.payload->>'date' END),(CASE WHEN p_request->'metadata'->>'category'='daily' THEN p_request->'metadata'->>'date' END),(p_request->>'journalDate')) dates(date_value)
      UNION SELECT r.payload->>'date' FROM tracker_sync.sync_records r JOIN pg_catalog.jsonb_array_elements(COALESCE(p_request->'replacedPhotos','[]'::jsonb)) x ON r.record_id=x->>'recordId'
        WHERE r.user_id=p_uid AND r.environment=p_env AND r.project_id=p_project AND r.kind='photo' AND r.payload->>'category'='daily'
    ) all_dates WHERE date_value IS NOT NULL) q;
  reason:=tracker_sync.photo_predicate(p_uid,p_env,p_project,p_request,dates);
  IF reason IS NOT NULL THEN RETURN tracker_sync.photo_terminal(p_uid,p_env,p_project,op,dev,p_fingerprint,'conflict',reason); END IF;
  IF (p_request->>'action'='edit' OR (p_request->>'action'='replace' AND p_request->>'baseRevision' IS NOT NULL)) AND p_request->'metadata'->>'createdAt' IS DISTINCT FROM old.payload->>'createdAt' THEN
    RETURN tracker_sync.photo_terminal(p_uid,p_env,p_project,op,dev,p_fingerprint,'rejected','invalid_photo_operation'); END IF;
  mid:=pg_catalog.gen_random_uuid();prefix:=p_project||'/'||p_env||'/'||p_uid::text||'/'||mid::text||'/';
  IF p_request->>'action' IN ('create','replace') THEN
    IF tracker_sync.photo_descriptor_valid(p_request->'original') IS DISTINCT FROM true OR tracker_sync.photo_descriptor_valid(p_request->'thumbnail') IS DISTINCT FROM true
      OR (p_request->'original'->>'assetId')::uuid=(p_request->'thumbnail'->>'assetId')::uuid THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_photo_operation'; END IF;
    IF EXISTS(SELECT 1 FROM tracker_sync.photo_manifests pm WHERE pm.user_id=p_uid AND pm.environment=p_env AND pm.project_id=p_project AND pm.action IN ('create','replace')
      AND ((pm.original->>'assetId')::uuid IN ((p_request->'original'->>'assetId')::uuid,(p_request->'thumbnail'->>'assetId')::uuid)
        OR (pm.thumbnail->>'assetId')::uuid IN ((p_request->'original'->>'assetId')::uuid,(p_request->'thumbnail'->>'assetId')::uuid))) THEN
      RETURN tracker_sync.photo_terminal(p_uid,p_env,p_project,op,dev,p_fingerprint,'conflict','asset_id_reused'); END IF;
    original:=p_request->'original'||pg_catalog.jsonb_build_object('path',prefix||'original.jpg');
    thumbnail:=p_request->'thumbnail'||pg_catalog.jsonb_build_object('path',prefix||'thumbnail.jpg');
  ELSE original:=old.payload->'original';thumbnail:=old.payload->'thumbnail'; END IF;
  INSERT INTO tracker_sync.photo_manifests(user_id,environment,project_id,manifest_id,operation_id,device_id,fingerprint,action,request,dates,original,thumbnail)
    VALUES(p_uid,p_env,p_project,mid,op,dev,p_fingerprint,p_request->>'action',p_request,dates,original,thumbnail);
  RETURN tracker_sync.photo_manifest(p_uid,p_env,p_project,mid,dev);
END $$;
CREATE FUNCTION tracker_sync.photo_verify(p_uid uuid,p_env text,p_project text,p_manifest uuid,p_device uuid,p_verified jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE m tracker_sync.photo_manifests; BEGIN
  PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,p_device);
  SELECT * INTO m FROM tracker_sync.photo_manifests WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest AND device_id=p_device FOR UPDATE;
  IF NOT FOUND OR m.state NOT IN ('prepared','verified') OR m.expires_at<=pg_catalog.clock_timestamp() OR m.action NOT IN ('create','replace')
    OR p_verified IS DISTINCT FROM pg_catalog.jsonb_build_object('original',m.original,'thumbnail',m.thumbnail) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='photo_verification_failed'; END IF;
  UPDATE tracker_sync.photo_manifests SET state='verified',verified_at=pg_catalog.clock_timestamp() WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest;
  RETURN pg_catalog.jsonb_build_object('verified',true);
END $$;
CREATE FUNCTION tracker_sync.photo_finalize(p_uid uuid,p_env text,p_project text,p_manifest uuid,p_device uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h bigint;m tracker_sync.photo_manifests;old tracker_sync.sync_records;written tracker_sync.sync_records;result jsonb;reason text;rev bigint;pos bigint;payload_value jsonb;
  removed jsonb; removals jsonb;envelopes jsonb:='[]'::jsonb;ordinal integer:=0;target_kind text;
BEGIN
  h:=tracker_sync.require_account(p_uid,p_env,p_project);PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,p_device);
  SELECT * INTO m FROM tracker_sync.photo_manifests WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest AND device_id=p_device FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='photo_unavailable'; END IF;
  SELECT o.result INTO result FROM tracker_sync.sync_operations o WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=m.operation_id;
  IF FOUND THEN RETURN result; END IF;
  IF m.state='closed' THEN reason:='manifest_closed';
  ELSIF m.expires_at<=pg_catalog.clock_timestamp() THEN reason:='manifest_expired';
  ELSIF m.action IN ('create','replace') AND m.state<>'verified' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='photo_not_verified';
  ELSE reason:=tracker_sync.photo_predicate(p_uid,p_env,p_project,m.request,m.dates); END IF;
  IF reason IS NOT NULL THEN
    UPDATE tracker_sync.photo_manifests SET state='closed' WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest;
    RETURN tracker_sync.photo_terminal(p_uid,p_env,p_project,m.operation_id,p_device,m.fingerprint,CASE WHEN reason IN ('manifest_closed','manifest_expired') THEN 'rejected' ELSE 'conflict' END,reason);
  END IF;
  removals:=CASE WHEN m.action='delete-daily' THEN m.request->'dailyPhotoSet' WHEN m.action='replace' AND m.request->>'baseRevision' IS NULL THEN m.request->'replacedPhotos' ELSE '[]'::jsonb END;
  FOR removed IN SELECT value FROM pg_catalog.jsonb_array_elements(removals) ORDER BY value->>'recordId' LOOP
    UPDATE tracker_sync.sync_records SET revision=revision+1,last_seq=h+1,deleted_at=pg_catalog.clock_timestamp()
      WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind='photo' AND record_id=removed->>'recordId' RETURNING * INTO written;
    INSERT INTO tracker_sync.sync_record_versions(user_id,environment,project_id,kind,record_id,revision,commit_seq,ordinal,operation_id,envelope)
      VALUES(p_uid,p_env,p_project,'photo',written.record_id,written.revision,h+1,ordinal,m.operation_id,tracker_sync.record_envelope(written));
    envelopes:=envelopes||pg_catalog.jsonb_build_array(tracker_sync.record_envelope(written));ordinal:=ordinal+1;
  END LOOP;
  target_kind:=CASE WHEN m.action='delete-daily' THEN 'journal' ELSE 'photo' END;
  SELECT * INTO old FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind=target_kind AND record_id=m.request->>'recordId';
  IF m.action='create' OR (m.action='replace' AND m.request->>'baseRevision' IS NULL) THEN rev:=1;SELECT COALESCE(max(position)+1,0) INTO pos FROM tracker_sync.sync_records WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind='photo';
  ELSE rev:=old.revision+1;pos:=old.position; END IF;
  IF m.action IN ('delete','delete-daily') THEN payload_value:=old.payload;
  ELSE payload_value:=m.request->'metadata'||pg_catalog.jsonb_build_object('original',m.original,'thumbnail',m.thumbnail); END IF;
  IF m.action IN ('create','replace') THEN
    INSERT INTO tracker_sync.photo_assets(user_id,environment,project_id,asset_id,manifest_id,variant,descriptor)
      VALUES(p_uid,p_env,p_project,(m.original->>'assetId')::uuid,p_manifest,'original',m.original),
            (p_uid,p_env,p_project,(m.thumbnail->>'assetId')::uuid,p_manifest,'thumbnail',m.thumbnail);
  END IF;
  INSERT INTO tracker_sync.sync_records(user_id,environment,project_id,kind,record_id,revision,last_seq,position,payload_schema,payload,local_date,deleted_at)
    VALUES(p_uid,p_env,p_project,target_kind,m.request->>'recordId',rev,h+1,pos,8,payload_value,(payload_value->>'date')::date,CASE WHEN m.action IN ('delete','delete-daily') THEN pg_catalog.clock_timestamp() END)
    ON CONFLICT(user_id,environment,project_id,kind,record_id) DO UPDATE SET revision=EXCLUDED.revision,last_seq=EXCLUDED.last_seq,payload=EXCLUDED.payload,local_date=EXCLUDED.local_date,deleted_at=EXCLUDED.deleted_at RETURNING * INTO written;
  envelopes:=envelopes||pg_catalog.jsonb_build_array(tracker_sync.record_envelope(written));
  result:=pg_catalog.jsonb_build_object('operationId',m.operation_id,'status','applied','commitSequence',(h+1)::text,'records',envelopes);
  INSERT INTO tracker_sync.sync_operations(user_id,environment,project_id,operation_id,device_id,fingerprint,terminal_status,commit_seq,result)
    VALUES(p_uid,p_env,p_project,m.operation_id,p_device,m.fingerprint,'applied',h+1,result);
  INSERT INTO tracker_sync.sync_record_versions(user_id,environment,project_id,kind,record_id,revision,commit_seq,ordinal,operation_id,envelope)
    VALUES(p_uid,p_env,p_project,target_kind,written.record_id,rev,h+1,ordinal,m.operation_id,tracker_sync.record_envelope(written));
  UPDATE tracker_sync.sync_accounts SET head_seq=h+1 WHERE user_id=p_uid AND environment=p_env AND project_id=p_project;
  UPDATE tracker_sync.photo_manifests SET state='finalized' WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest;
  RETURN result;
END $$;
CREATE FUNCTION tracker_sync.photo_abandon(p_uid uuid,p_env text,p_project text,p_manifest uuid,p_device uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE m tracker_sync.photo_manifests;result jsonb; BEGIN
  PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,p_device);
  SELECT * INTO m FROM tracker_sync.photo_manifests WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest AND device_id=p_device FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='photo_unavailable'; END IF;
  SELECT o.result INTO result FROM tracker_sync.sync_operations o WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=m.operation_id;
  IF FOUND THEN RETURN result; END IF;
  UPDATE tracker_sync.photo_manifests SET state='closed' WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND manifest_id=p_manifest;
  RETURN tracker_sync.photo_terminal(p_uid,p_env,p_project,m.operation_id,p_device,m.fingerprint,'rejected','manifest_closed');
END $$;
CREATE FUNCTION tracker_sync.photo_asset(p_uid uuid,p_env text,p_project text,p_asset uuid,p_device uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
  PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,p_device);
  SELECT descriptor INTO result FROM tracker_sync.photo_assets WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND asset_id=p_asset;
  RETURN result;
END $$;

-- Existing JSON commands retain their format. Journal deletion with daily
-- photos requires the explicit reviewed v2 compound command, including CAS.
ALTER FUNCTION tracker_sync.push(uuid,text,text,jsonb,text) RENAME TO push_json_v1;
CREATE FUNCTION tracker_sync.push(p_uid uuid,p_env text,p_project text,p_request jsonb,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE op uuid;dev uuid; BEGIN
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  op:=(p_request->>'operationId')::uuid;dev:=(p_request->>'deviceId')::uuid;
  PERFORM tracker_sync.photo_require_device(p_uid,p_env,p_project,dev);
  IF EXISTS(SELECT 1 FROM tracker_sync.sync_operations WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=op) THEN
    RETURN tracker_sync.push_json_v1(p_uid,p_env,p_project,p_request,p_fingerprint); END IF;
  IF EXISTS(SELECT 1 FROM tracker_sync.photo_manifests WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND operation_id=op) THEN
    RETURN pg_catalog.jsonb_build_object('operationId',op,'status','rejected','code','operation_id_reused'); END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_request->'changes') c JOIN tracker_sync.sync_records j ON j.kind='journal' AND j.record_id=c->>'recordId'
    WHERE j.user_id=p_uid AND j.environment=p_env AND j.project_id=p_project AND c->>'kind'='journal' AND j.deleted_at IS NULL
      AND (c->>'action'='delete' OR (c->>'action'='update' AND c->'payload'->>'date' IS DISTINCT FROM j.payload->>'date'))
      AND EXISTS(SELECT 1 FROM tracker_sync.sync_records p WHERE p.user_id=p_uid AND p.environment=p_env AND p.project_id=p_project
        AND p.kind='photo' AND p.deleted_at IS NULL AND p.payload->>'category'='daily' AND p.payload->>'date'=j.payload->>'date')) THEN
    RETURN tracker_sync.photo_terminal(p_uid,p_env,p_project,op,dev,p_fingerprint,'conflict','photo_review_required'); END IF;
  RETURN tracker_sync.push_json_v1(p_uid,p_env,p_project,p_request,p_fingerprint);
END $$;

-- Preserve 001/002 read logic under explicit v2 negotiation. A v1 reader stops
-- before any page of an unsupported feed/snapshot can silently lose a photo.
ALTER FUNCTION tracker_sync.pull(uuid,text,text,text,integer) RENAME TO pull_v2;
ALTER FUNCTION tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer) RENAME TO bootstrap_v2;
CREATE FUNCTION tracker_sync.pull(p_uid uuid,p_env text,p_project text,p_after text,p_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  IF EXISTS(SELECT 1 FROM tracker_sync.sync_record_versions WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind='photo' AND commit_seq>p_after::bigint) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='unsupported_photo_protocol'; END IF;
  RETURN tracker_sync.pull_v2(p_uid,p_env,p_project,p_after,p_limit);
END $$;
CREATE FUNCTION tracker_sync.bootstrap(p_uid uuid,p_env text,p_project text,p_head text,p_cursor jsonb,p_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  PERFORM tracker_sync.require_account(p_uid,p_env,p_project);
  IF EXISTS(SELECT 1 FROM tracker_sync.sync_record_versions WHERE user_id=p_uid AND environment=p_env AND project_id=p_project AND kind='photo' AND (p_head IS NULL OR commit_seq<=p_head::bigint)) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='unsupported_photo_protocol'; END IF;
  RETURN tracker_sync.bootstrap_v2(p_uid,p_env,p_project,p_head,p_cursor,p_limit);
END $$;

-- Managed Storage metadata is read-only here. Create the bucket through the
-- Dashboard/API first; never silently create/change a managed bucket in SQL.
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='tracker-preview-photos' AND public=false) THEN RAISE EXCEPTION 'photo_private_bucket_required'; END IF;
END $$;
CREATE SCHEMA tracker_photo_policy;
REVOKE ALL ON SCHEMA tracker_photo_policy FROM PUBLIC;
GRANT USAGE ON SCHEMA tracker_photo_policy TO authenticated,anon,tracker_sync_owner;
-- This no-argument bridge is intentionally owned by the migration operator.
-- It can only read Supabase's request UID, not tables or a caller-supplied UID.
-- The restricted definer does not need grants on the managed Auth schema.
CREATE FUNCTION tracker_photo_policy.request_uid() RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() $$;
REVOKE ALL ON FUNCTION tracker_photo_policy.request_uid() FROM PUBLIC;
CREATE FUNCTION tracker_photo_policy.allowed(p_name text,p_write boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE uid uuid;parts text[];allowed boolean; BEGIN
  uid:=tracker_photo_policy.request_uid();parts:=pg_catalog.string_to_array(p_name,'/');
  IF uid IS NULL OR pg_catalog.array_length(parts,1) IS DISTINCT FROM 5 OR parts[1]!~'^[a-z0-9-]{1,128}$' OR parts[2] NOT IN ('test','preview','production')
    OR parts[3] IS DISTINCT FROM uid::text OR parts[4]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR parts[5] NOT IN ('original.jpg','thumbnail.jpg') THEN RETURN false; END IF;
  PERFORM tracker_sync.set_scope(uid,parts[2],parts[1]);
  IF NOT EXISTS(SELECT 1 FROM tracker_sync.sync_accounts WHERE user_id=uid AND environment=parts[2] AND project_id=parts[1] AND status='active') THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM tracker_sync.photo_manifests m JOIN tracker_sync.sync_devices d USING(user_id,environment,project_id,device_id)
    WHERE m.user_id=uid AND m.environment=parts[2] AND m.project_id=parts[1] AND m.manifest_id=parts[4]::uuid
    AND m.action IN ('create','replace') AND m.state IN ('prepared','verified') AND m.expires_at>pg_catalog.clock_timestamp() AND d.disabled_at IS NULL
    AND (m.original->>'path'=p_name OR m.thumbnail->>'path'=p_name) AND (NOT p_write OR m.state='prepared')) INTO allowed;
  IF NOT p_write THEN allowed:=allowed OR EXISTS(SELECT 1 FROM tracker_sync.photo_assets WHERE user_id=uid AND environment=parts[2] AND project_id=parts[1] AND descriptor->>'path'=p_name); END IF;
  RETURN allowed;
END $$;
GRANT CREATE ON SCHEMA tracker_sync,tracker_photo_policy TO tracker_sync_owner;
DO $$ DECLARE f record;r text; BEGIN
  FOR f IN SELECT p.oid::pg_catalog.regprocedure AS signature FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('tracker_sync','tracker_photo_policy') AND p.oid<>'tracker_photo_policy.request_uid()'::pg_catalog.regprocedure LOOP EXECUTE pg_catalog.format('ALTER FUNCTION %s OWNER TO tracker_sync_owner',f.signature); END LOOP;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=r) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON tracker_sync.photo_manifests,tracker_sync.photo_assets FROM %I',r);
    END IF;
  END LOOP;
END $$;
REVOKE CREATE ON SCHEMA tracker_sync,tracker_photo_policy FROM tracker_sync_owner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tracker_photo_policy FROM PUBLIC;
-- Rebuild private function ACLs from the explicit caller list below. Named-role
-- revokes alone miss global default grants inherited through other roles.
DO $$ DECLARE recipient record; BEGIN
  FOR recipient IN SELECT DISTINCT p.oid::pg_catalog.regprocedure AS signature,a.grantee
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
    LATERAL pg_catalog.aclexplode(p.proacl) a
    WHERE n.nspname IN ('tracker_sync','tracker_photo_policy')
    AND a.grantee<>0 AND a.grantee<>p.proowner LOOP
    EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM %I',recipient.signature,pg_catalog.pg_get_userbyid(recipient.grantee));
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION tracker_photo_policy.request_uid() TO tracker_sync_owner;
GRANT EXECUTE ON FUNCTION tracker_photo_policy.allowed(text,boolean) TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tracker_sync FROM PUBLIC,tracker_gateway;
GRANT EXECUTE ON FUNCTION tracker_sync.register_account_device(uuid,text,text,uuid),tracker_sync.read_state(uuid,text,text),tracker_sync.lookup_receipt(uuid,text,text,uuid),
  tracker_sync.push(uuid,text,text,jsonb,text),tracker_sync.record_rejection(uuid,text,text,jsonb,text,text,text),
  tracker_sync.pull(uuid,text,text,text,integer),tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer),tracker_sync.pull_v2(uuid,text,text,text,integer),tracker_sync.bootstrap_v2(uuid,text,text,text,jsonb,integer),
  tracker_sync.photo_prepare(uuid,text,text,jsonb,text),tracker_sync.photo_manifest(uuid,text,text,uuid,uuid),tracker_sync.photo_verify(uuid,text,text,uuid,uuid,jsonb),
  tracker_sync.photo_finalize(uuid,text,text,uuid,uuid),tracker_sync.photo_abandon(uuid,text,text,uuid,uuid),tracker_sync.photo_asset(uuid,text,text,uuid,uuid) TO tracker_gateway;
-- STORAGE POLICY INSTALLATION: hosted operator extracts this block for the
-- provider-supported Dashboard execution context. No managed ownership change.
CREATE POLICY tracker_photo_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='tracker-preview-photos' AND tracker_photo_policy.allowed(name,false));
CREATE POLICY tracker_photo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='tracker-preview-photos' AND tracker_photo_policy.allowed(name,true));
CREATE POLICY tracker_photo_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id<>'tracker-preview-photos' OR tracker_photo_policy.allowed(name,false));
CREATE POLICY tracker_photo_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'tracker-preview-photos' OR tracker_photo_policy.allowed(name,true));
CREATE POLICY tracker_photo_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'tracker-preview-photos') WITH CHECK(bucket_id<>'tracker-preview-photos');
CREATE POLICY tracker_photo_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'tracker-preview-photos');
CREATE POLICY tracker_photo_anon_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon USING(bucket_id<>'tracker-preview-photos') WITH CHECK(bucket_id<>'tracker-preview-photos');
COMMIT;
