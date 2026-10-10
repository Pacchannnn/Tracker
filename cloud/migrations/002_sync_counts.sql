-- Batch2 additive protocol completeness fields. No payload/schema/data rewrite.
-- Apply after 001 as migration administrator, never browser/Tracker user origin.
BEGIN;
CREATE OR REPLACE FUNCTION tracker_sync.pull(p_uid uuid,p_env text,p_project text,p_after text,p_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE h bigint; a bigint; groups jsonb; last_seq bigint; floor_seq bigint; BEGIN
  h:=tracker_sync.require_account(p_uid,p_env,p_project);
  IF p_after IS NULL OR p_after!~'^(0|[1-9][0-9]*)$' OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_cursor'; END IF;
  a:=p_after::bigint;
  SELECT min_available_seq INTO floor_seq FROM tracker_sync.sync_accounts WHERE user_id=p_uid AND environment=p_env AND project_id=p_project;
  IF a<floor_seq OR a>h THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='resnapshot_required'; END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(group_json ORDER BY commit_seq),'[]'::jsonb),COALESCE(max(commit_seq),a) INTO groups,last_seq
  FROM (SELECT o.commit_seq, pg_catalog.jsonb_build_object('commitSequence',o.commit_seq::text,'operationId',o.operation_id,
    'recordCount',(SELECT count(*)::integer FROM tracker_sync.sync_record_versions v WHERE v.user_id=p_uid AND v.environment=p_env AND v.project_id=p_project AND v.commit_seq=o.commit_seq),
    'records',(SELECT pg_catalog.jsonb_agg(v.envelope ORDER BY ordinal) FROM tracker_sync.sync_record_versions v
      WHERE v.user_id=p_uid AND v.environment=p_env AND v.project_id=p_project AND v.commit_seq=o.commit_seq)) AS group_json
    FROM tracker_sync.sync_operations o WHERE o.user_id=p_uid AND o.environment=p_env AND o.project_id=p_project
      AND o.terminal_status='applied' AND o.commit_seq>a AND o.commit_seq<=h ORDER BY o.commit_seq LIMIT p_limit) q;
  RETURN pg_catalog.jsonb_build_object('headSequence',h::text,'afterSequence',last_seq::text,'groups',groups,'hasMore',last_seq<h);
END $$;
CREATE OR REPLACE FUNCTION tracker_sync.bootstrap(p_uid uuid,p_env text,p_project text,p_head text,p_cursor jsonb,p_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE h bigint; snapshot_head bigint; records jsonb; cursor_out jsonb; more boolean; total integer; BEGIN
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
    (SELECT count(*)>p_limit FROM page),(SELECT count(*)::integer FROM latest) INTO records,cursor_out,more,total;
  RETURN pg_catalog.jsonb_build_object('headSequence',snapshot_head::text,'snapshotRecordCount',total,'records',records,'cursor',CASE WHEN more THEN cursor_out END,'hasMore',more);
END $$;
GRANT CREATE ON SCHEMA tracker_sync TO tracker_sync_owner;
ALTER FUNCTION tracker_sync.pull(uuid,text,text,text,integer) OWNER TO tracker_sync_owner;
ALTER FUNCTION tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer) OWNER TO tracker_sync_owner;
REVOKE CREATE ON SCHEMA tracker_sync FROM tracker_sync_owner;
REVOKE ALL ON FUNCTION tracker_sync.pull(uuid,text,text,text,integer),tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer) FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=role_name) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION tracker_sync.pull(uuid,text,text,text,integer),tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer) FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION tracker_sync.pull(uuid,text,text,text,integer),tracker_sync.bootstrap(uuid,text,text,text,jsonb,integer) TO tracker_gateway;
COMMIT;
