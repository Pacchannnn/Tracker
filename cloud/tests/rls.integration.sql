-- Real PostgreSQL integration suite; synthetic disposable database ONLY.
-- Prerequisites: auth.users(id uuid primary key), anon/authenticated roles,
-- 001_foundation.sql applied by migration admin. Run with ON_ERROR_STOP=1.
-- Every assertion raises on failure. ROLLBACK removes ALL synthetic fixtures.
BEGIN;
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
SET LOCAL ROLE tracker_gateway;
SELECT tracker_sync.register_account_device('00000000-0000-4000-8000-000000000001','test','synthetic-project','00000000-0000-4000-8000-000000000011');
SELECT tracker_sync.register_account_device('00000000-0000-4000-8000-000000000002','test','synthetic-project','00000000-0000-4000-8000-000000000022');
DO $$ DECLARE a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002';
  device uuid:='00000000-0000-4000-8000-000000000011'; op jsonb; receipt jsonb; replay jsonb; state jsonb; feed jsonb; snap jsonb;
BEGIN
  op:=pg_catalog.jsonb_build_object('protocolVersion',1,'operationId','00000000-0000-4000-8000-000000000101','deviceId',device,
    'commandType','import-records','dependencies','[]'::jsonb,'validatedHead','0','readSet','[]'::jsonb,
    'changes','[{"kind":"food","recordId":"legacy/id:food","action":"create","baseRevision":null,"payloadSchema":8,"payload":{"id":"legacy/id:food","name":"synthetic","nested":[{"sets":[2,1]}]}},
      {"kind":"journal","recordId":"journal-a","action":"create","baseRevision":null,"payloadSchema":8,"payload":{"id":"journal-a","date":"2026-10-08","title":"synthetic","note":"fixture","tags":[]}}]'::jsonb);
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-101');
  IF receipt->>'status'<>'applied' OR receipt->>'commitSequence'<>'1' OR pg_catalog.jsonb_array_length(receipt->'records')<>2 THEN RAISE EXCEPTION 'compound create failed: %',receipt; END IF;
  replay:=tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-101');
  IF replay IS DISTINCT FROM receipt THEN RAISE EXCEPTION 'lost acknowledgement retry changed receipt'; END IF;
  IF tracker_sync.lookup_receipt(b,'test','synthetic-project','00000000-0000-4000-8000-000000000101') IS NOT NULL THEN RAISE EXCEPTION 'cross-account receipt leaked'; END IF;
  IF tracker_sync.push(a,'test','synthetic-project',op,'changed-fingerprint')->>'code'<>'operation_id_reused' THEN RAISE EXCEPTION 'operation ID reuse accepted'; END IF;
  state:=tracker_sync.read_state(a,'test','synthetic-project');
  IF state->>'headSequence'<>'1' OR state->'records'->0->'payload'->'nested'->0->'sets'<>'[2,1]'::jsonb THEN RAISE EXCEPTION 'legacy identity or nested array order changed'; END IF;
  IF pg_catalog.jsonb_array_length(tracker_sync.read_state(b,'test','synthetic-project')->'records')<>0 THEN RAISE EXCEPTION 'cross-account records leaked'; END IF;
  -- Failed second CAS must roll back successful first write/version/head.
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000102","commandType":"update-records","validatedHead":"1",
    "changes":[{"kind":"food","recordId":"legacy/id:food","action":"update","baseRevision":"1","payloadSchema":8,"payload":{"name":"must-rollback"}},
      {"kind":"journal","recordId":"journal-a","action":"update","baseRevision":"99","payloadSchema":8,"payload":{"date":"2026-10-08"}}]}'::jsonb;
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-102');
  IF receipt->>'status'<>'conflict' OR tracker_sync.read_state(a,'test','synthetic-project') IS DISTINCT FROM state THEN RAISE EXCEPTION 'compound CAS did not roll back'; END IF;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-102') IS DISTINCT FROM receipt THEN RAISE EXCEPTION 'conflict receipt retry changed'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000103","commandType":"import-records",
    "changes":[{"kind":"journal","recordId":"journal-other-id","action":"create","baseRevision":null,"payloadSchema":8,"payload":{"date":"2026-10-08"}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-103')->>'status'<>'conflict' THEN RAISE EXCEPTION 'duplicate live journal date accepted'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000104","changes":[{"kind":"food","recordId":"future","action":"create","payloadSchema":9,"payload":{}}]}'::jsonb;
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-104');
  IF receipt->>'status'<>'rejected' OR tracker_sync.lookup_receipt(a,'test','synthetic-project','00000000-0000-4000-8000-000000000104') IS DISTINCT FROM receipt THEN RAISE EXCEPTION 'future schema not rejected with receipt'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000105","changes":[{"kind":"photo","recordId":"forbidden","action":"create","payloadSchema":8,"payload":{}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-105')->>'status'<>'rejected' THEN RAISE EXCEPTION 'photo protocol accidentally enabled'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000106","changes":[{"kind":"food","recordId":"duplicate","action":"create","payloadSchema":8,"payload":{}},{"kind":"food","recordId":"duplicate","action":"create","payloadSchema":8,"payload":{}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-106')->>'status'<>'rejected' THEN RAISE EXCEPTION 'duplicate changed keys accepted'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000107","commandType":"delete-records",
    "changes":[{"kind":"food","recordId":"legacy/id:food","action":"delete","baseRevision":"1","payloadSchema":8}]}'::jsonb;
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-107');
  IF receipt->>'status'<>'applied' OR receipt->>'commitSequence'<>'2' OR receipt->'records'->0->>'deleted'<>'true' OR receipt->'records'->0->>'revision'<>'2' THEN RAISE EXCEPTION 'tombstone failed: %',receipt; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000108","commandType":"import-records","validatedHead":"2",
    "changes":[{"kind":"food","recordId":"legacy/id:food","action":"create","baseRevision":null,"payloadSchema":8,"payload":{}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-108')->>'status'<>'conflict' THEN RAISE EXCEPTION 'tombstone resurrection accepted'; END IF;
  feed:=tracker_sync.pull(a,'test','synthetic-project','0',1);
  IF feed->>'afterSequence'<>'1' OR pg_catalog.jsonb_array_length(feed->'groups')<>1 OR pg_catalog.jsonb_array_length(feed->'groups'->0->'records')<>2 OR feed->>'hasMore'<>'true' THEN RAISE EXCEPTION 'feed split compound commit: %',feed; END IF;
  feed:=tracker_sync.pull(a,'test','synthetic-project','1',1);
  IF feed->>'afterSequence'<>'2' OR feed->'groups'->0->'records'->0->>'deleted'<>'true' THEN RAISE EXCEPTION 'feed omitted tombstone'; END IF;
  snap:=tracker_sync.bootstrap(a,'test','synthetic-project','1',NULL,1);
  IF snap->'records'->0->>'deleted'<>'false' OR snap->'records'->0->>'revision'<>'1' OR snap->>'hasMore'<>'true' THEN RAISE EXCEPTION 'snapshot H changed after later write'; END IF;
  snap:=tracker_sync.bootstrap(a,'test','synthetic-project','1',snap->'cursor',1);
  IF snap->'records'->0->>'recordId'<>'journal-a' OR snap->>'hasMore'<>'false' THEN RAISE EXCEPTION 'snapshot keyset paging failed'; END IF;
  -- Whole head and semantic read sets both independently close validation races.
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000109","validatedHead":"1","changes":[{"kind":"food","recordId":"fresh","action":"create","payloadSchema":8,"payload":{}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-109')->>'code'<>'stale_validation' THEN RAISE EXCEPTION 'stale validated head accepted'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000110","validatedHead":"2","readSet":[{"kind":"journal","recordId":"journal-a","revision":"99"}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fingerprint-110')->>'code'<>'stale_read_set' THEN RAISE EXCEPTION 'stale semantic source accepted'; END IF;
  BEGIN PERFORM tracker_sync.read_state(a,'test','wrong-project'); RAISE EXCEPTION 'wrong project accepted'; EXCEPTION WHEN invalid_authorization_specification THEN NULL; END;
  BEGIN PERFORM tracker_sync.push(a,'test','synthetic-project',op||pg_catalog.jsonb_build_object('deviceId','00000000-0000-4000-8000-000000000022'),'spoof-device'); RAISE EXCEPTION 'foreign device accepted'; EXCEPTION WHEN invalid_authorization_specification THEN NULL; END;
  BEGIN PERFORM * FROM tracker_sync.sync_records; RAISE EXCEPTION 'gateway direct SELECT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO tracker_sync.sync_records(user_id) VALUES(a); RAISE EXCEPTION 'gateway direct INSERT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM tracker_sync.set_scope(a,'test','synthetic-project'); RAISE EXCEPTION 'gateway context helper allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: atomic CAS, idempotent applied/conflict/rejected receipts, tenants, schema, photo denial, tombstone, feed, snapshot, TOCTOU, gateway privileges';
END $$;
DO $$ DECLARE a uuid:='00000000-0000-4000-8000-000000000001';
  op jsonb; receipt jsonb; state jsonb;
BEGIN
  op:='{"protocolVersion":1,"operationId":"00000000-0000-4000-8000-000000000201","deviceId":"00000000-0000-4000-8000-000000000011",
    "commandType":"import-records","dependencies":[],"validatedHead":"2","readSet":[],"changes":[
      {"kind":"plan","recordId":"P","action":"create","payloadSchema":8,"payload":{"id":"P"}},
      {"kind":"account_settings","recordId":"default","action":"create","payloadSchema":8,"payload":{"activePlanId":"P"}},
      {"kind":"workout","recordId":"S","action":"create","payloadSchema":8,"phase":"live","payload":{"id":"S","sets":[{"id":"old-set"}]}},
      {"kind":"planning_draft","recordId":"00000000-0000-4000-8000-000000000011","action":"create","payloadSchema":8,"payload":{"revision":1}}
    ]}'::jsonb;
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fp-201');
  IF receipt->>'status'<>'applied' THEN RAISE EXCEPTION 'domain fixture import failed: %',receipt; END IF;
  state:=tracker_sync.read_state(a,'test','synthetic-project');
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000202","commandType":"delete-records","validatedHead":"3",
    "changes":[{"kind":"plan","recordId":"P","action":"delete","baseRevision":"1","payloadSchema":8}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-202')->>'code'<>'active_plan_conflict' OR tracker_sync.read_state(a,'test','synthetic-project') IS DISTINCT FROM state THEN RAISE EXCEPTION 'active plan deleted without clearing pointer'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000203","changes":[
    {"kind":"plan","recordId":"P","action":"delete","baseRevision":"1","payloadSchema":8},
    {"kind":"account_settings","recordId":"default","action":"update","baseRevision":"1","payloadSchema":8,"payload":{"activePlanId":null}}]}'::jsonb;
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fp-203');
  IF receipt->>'status'<>'applied' OR receipt->>'commitSequence'<>'4' THEN RAISE EXCEPTION 'active plan compound deletion failed: %',receipt; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000204","commandType":"complete-workout","validatedHead":"4","changes":[
    {"kind":"workout","recordId":"S","action":"update","baseRevision":"1","payloadSchema":8,"phase":"completed","payload":{"id":"S","sets":[{"id":"old-set"}]}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-204')->>'status'<>'applied' THEN RAISE EXCEPTION 'live completion failed'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000205","commandType":"update-records","validatedHead":"5","changes":[
    {"kind":"workout","recordId":"S","action":"update","baseRevision":"2","payloadSchema":8,"phase":"live","payload":{"id":"S"}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-205')->>'status'<>'rejected' THEN RAISE EXCEPTION 'completed workout downgraded to live'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000206","commandType":"teleport-history"}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-206')->>'status'<>'rejected' THEN RAISE EXCEPTION 'unsupported semantic command accepted'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000207","commandType":"import-records","changes":[
    {"kind":"planning_draft","recordId":"00000000-0000-4000-8000-000000000022","action":"create","payloadSchema":8,"payload":{}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-207')->>'status'<>'rejected' THEN RAISE EXCEPTION 'draft written into foreign device slot'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000208","dependencies":["00000000-0000-4000-8000-000000000201"]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-208')->>'status'<>'rejected' THEN RAISE EXCEPTION 'unsupported dependency chain accepted'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000209","dependencies":[]}'::jsonb;
  receipt:=tracker_sync.record_rejection(a,'test','synthetic-project',op,'fp-209','rejected','invalid_payload');
  IF receipt->>'status'<>'rejected' OR receipt->>'code'<>'invalid_payload' OR tracker_sync.read_state(a,'test','synthetic-project')->>'headSequence'<>'5' THEN RAISE EXCEPTION 'gateway domain rejection changed head'; END IF;
  IF tracker_sync.record_rejection(a,'test','synthetic-project',op,'fp-209','rejected','invalid_payload') IS DISTINCT FROM receipt THEN RAISE EXCEPTION 'gateway rejected receipt replay changed'; END IF;
  IF tracker_sync.record_rejection(a,'test','synthetic-project',op,'fp-reused','rejected','invalid_payload')->>'code'<>'operation_id_reused' THEN RAISE EXCEPTION 'gateway rejected receipt fingerprint mismatch accepted'; END IF;
  BEGIN PERFORM tracker_sync.record_rejection(a,'test','synthetic-project',op,'fp-209','applied','invalid_payload'); RAISE EXCEPTION 'rejection helper accepted applied'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000210","commandType":"correct-history","changes":[
    {"kind":"workout","recordId":"S","action":"update","baseRevision":"2","payloadSchema":8,"phase":"completed","payload":{"id":"S"}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-210')->>'status'<>'rejected' THEN RAISE EXCEPTION 'history correction lacked reviewed device candidate'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000211","commandType":"import-records","changes":[
    {"kind":"history_candidate","recordId":"candidate-S","action":"create","payloadSchema":8,"payload":{"sourceSessionId":"S","session":{"id":"S"}}}]}'::jsonb;
  IF tracker_sync.push(a,'test','synthetic-project',op,'fp-211')->>'status'<>'applied' THEN RAISE EXCEPTION 'history candidate creation failed'; END IF;
  op:=op||'{"operationId":"00000000-0000-4000-8000-000000000212","commandType":"correct-history","validatedHead":"6","changes":[
    {"kind":"workout","recordId":"S","action":"update","baseRevision":"2","payloadSchema":8,"phase":"completed","payload":{"id":"S"}},
    {"kind":"history_candidate","recordId":"candidate-S","action":"delete","baseRevision":"1","payloadSchema":8}]}'::jsonb;
  receipt:=tracker_sync.push(a,'test','synthetic-project',op,'fp-212');
  IF receipt->>'status'<>'applied' OR receipt->'records'->1->>'sourceSessionId'<>'S' OR receipt->'records'->1->>'deleted'<>'true' THEN RAISE EXCEPTION 'compound history correction/source preservation failed: %',receipt; END IF;
  RAISE NOTICE 'PASS: active plan compound pointer guard, workout phase transitions, draft device scope, unsupported semantic commands/dependencies';
END $$;
RESET ROLE;
SET LOCAL ROLE tracker_sync_owner;
SELECT tracker_sync.set_scope('00000000-0000-4000-8000-000000000001','test','synthetic-project');
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM tracker_sync.sync_accounts WHERE user_id='00000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'helper owner RLS SELECT leaked B'; END IF;
  BEGIN INSERT INTO tracker_sync.sync_devices(user_id,environment,project_id,device_id) VALUES('00000000-0000-4000-8000-000000000002','test','synthetic-project','00000000-0000-4000-8000-000000000033');
    RAISE EXCEPTION 'helper owner RLS INSERT into B allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE tracker_sync.sync_record_versions SET revision=99; RAISE EXCEPTION 'immutable version UPDATE allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: forced helper-owner RLS and immutable versions';
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM pg_catalog.set_config('tracker.user_id','00000000-0000-4000-8000-000000000002',true);
  BEGIN PERFORM * FROM tracker_sync.sync_records; RAISE EXCEPTION 'anon SELECT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO tracker_sync.sync_records(user_id) VALUES('00000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'anon INSERT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM tracker_sync.read_state('00000000-0000-4000-8000-000000000002','test','synthetic-project'); RAISE EXCEPTION 'anon helper EXECUTE allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: anon direct SELECT/INSERT/helper EXECUTE denied despite spoofed context';
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM * FROM tracker_sync.sync_records; RAISE EXCEPTION 'authenticated SELECT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO tracker_sync.sync_records(user_id) VALUES('00000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'authenticated INSERT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM tracker_sync.read_state('00000000-0000-4000-8000-000000000002','test','synthetic-project'); RAISE EXCEPTION 'authenticated helper EXECUTE allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS: authenticated direct SELECT/INSERT/helper EXECUTE denied';
END $$;
RESET ROLE;
UPDATE tracker_sync.sync_accounts SET status='disabled' WHERE user_id='00000000-0000-4000-8000-000000000002';
SET LOCAL ROLE tracker_gateway;
DO $$ BEGIN
  BEGIN PERFORM tracker_sync.read_state('00000000-0000-4000-8000-000000000002','test','synthetic-project'); RAISE EXCEPTION 'disabled account allowed'; EXCEPTION WHEN invalid_authorization_specification THEN NULL; END;
  RAISE NOTICE 'PASS: disabled account denied';
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='tracker_sync' AND p.prosecdef AND NOT ('search_path=""'=ANY(p.proconfig))) THEN RAISE EXCEPTION 'unsafe function search_path'; END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='tracker_sync' AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)) THEN RAISE EXCEPTION 'RLS missing'; END IF;
  RAISE NOTICE 'PASS: all tables FORCE RLS and privileged functions fixed empty search_path';
END $$;
ROLLBACK;
