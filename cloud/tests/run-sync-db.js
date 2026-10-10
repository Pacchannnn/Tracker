import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { IDBFactory } from 'fake-indexeddb';
import { createGateway, createSqlStore } from '../gateway.js';
import { createAccountStore } from '../../js/cloud-store.js';
import { createSyncEngine } from '../../js/cloud-sync.js';
import { createStartedSession, applySessionCommand, createSessionStore } from '../../js/session-runtime.js';
import { createHistoryEditBase } from '../../js/session-identity.js';
import { createDraftStore } from '../../js/planning-draft.js';
import { representativeState } from '../../tests/fixtures/representative-state.js';

// All fixtures synthetic; real PostgreSQL WASM + real IDB transactions via fake-indexeddb.
// PGlite is single connection; NOT evidence of native multi-connection concurrency.
const db = new PGlite(); let assertions = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); assertions++; };
const uid = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const deviceA = '33333333-3333-4333-8333-333333333333', deviceB = '44444444-4444-4444-8444-444444444444';
const scope = { uid, environment: 'test', projectId: 'synthetic-sync' };
const food = id => ({ id, name: 'Synthetic ' + id, serving: 'portion', notes: '', calories: 100, protein: 2, carbs: 20, fat: 1 });
const query = (sql, params) => db.query(sql, params);
let sqlStore, gateway;
async function device(id, indexedDB = new IDBFactory(), accountScope = scope) {
  let offline = false, lost = false, malformed = false; const calls = [];
  const store = createAccountStore({ indexedDB, deviceId: id }); await store.open(accountScope);
  const transport = { async call(route, body) {
    calls.push({ route, body: structuredClone(body) });
    if (offline) throw Error('synthetic offline');
    const result = await gateway.handle({ route, body, authorization: accountScope.uid });
    if (result?.status === 'error') process.stderr.write(`Synthetic gateway ${route} error: ${result.code}\n`);
    if (route === 'push' && lost) { lost = false; throw Error('synthetic lost acknowledgement'); }
    if (route === 'pull' && malformed && result.groups.length) { malformed = false; result.groups[0].recordCount++; }
    return result;
  } };
  const engine = createSyncEngine({ store, scope: accountScope, transport, isCurrent: () => true, pageLimit: 1 });
  return { store, engine, indexedDB, calls, row: () => store.read(accountScope), commit: change => store.commit(accountScope, change),
    offline: value => { offline = value; }, lost: () => { lost = true; }, malformed: () => { malformed = true; }, close() { engine.pause(); store.seal(); } };
}
async function sync(client, expected = 'synced') {
  const result = await client.engine.sync(); check(result.status, expected, 'engine status: ' + JSON.stringify(result)); return client.row();
}
async function resolveRemote(client) {
  const pending = (await client.row()).conflicts.find(c => c.status === 'unresolved');
  assert.ok(pending, 'durable conflict'); assertions++;
  const reviewed = await client.engine.readConflict(pending.id);
  check(await client.engine.resolveConflict(pending.id, 'remote', reviewed.reviewToken), { applied: true }, 'explicit reviewed remote resolution');
  return sync(client);
}
try {
  await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  for (const filename of ['001_foundation.sql', '002_sync_counts.sql']) await db.exec(await readFile(new URL('../migrations/' + filename, import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('./rls.integration.sql', import.meta.url), 'utf8')); assertions++;
  process.stdout.write('PASS Batch1 SQL/RLS integration after additive migration002.\n');
  const privileges = await query("SELECT p.proname,r.rolname,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='tracker_sync' AND p.proname IN ('pull','bootstrap')");
  check(privileges.rows.map(r => [r.rolname, r.prosecdef, r.proconfig]), [['tracker_sync_owner', true, ['search_path=""']], ['tracker_sync_owner', true, ['search_path=""']]], 'updated helper security context');
  const tables = await query("SELECT bool_and(relrowsecurity AND relforcerowsecurity) AS protected FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tracker_sync' AND c.relkind='r'");
  check(tables.rows[0].protected, true, 'all tables retain FORCE RLS');
  await query('INSERT INTO auth.users(id) VALUES($1),($2)', [uid, other]);
  for (const account of [uid, other]) for (const id of [deviceA, deviceB]) await query('SELECT tracker_sync.register_account_device($1::uuid,$2::text,$3::text,$4::uuid)', [account, scope.environment, scope.projectId, id]);
  for (const isolatedScope of [{ ...scope, environment: 'preview' }, { ...scope, projectId: 'other-project' }]) await query('SELECT tracker_sync.register_account_device($1::uuid,$2::text,$3::text,$4::uuid)', [uid, isolatedScope.environment, isolatedScope.projectId, deviceA]);
  await db.exec('SET ROLE tracker_gateway');
  sqlStore = createSqlStore(query);
  gateway = createGateway({ verifyIdentity: async authorization => { if (![uid, other].includes(authorization)) throw Error('unauthorized'); return { uid: authorization }; }, store: sqlStore, environment: scope.environment, projectId: scope.projectId, allowWrites: true });
  let a = await device(deviceA), b = await device(deviceB); const outsider = await device(deviceA, new IDBFactory(), { ...scope, uid: other });
  await sync(a); await sync(b); await sync(outsider);
  await a.commit(data => { data.foods.push(food('shared')); }); await sync(a); let row = await sync(b);
  check(row.data.foods[0].id, 'shared', 'A to B via database');
  await b.commit(data => { data.foods[0].name = 'B edited'; }); await sync(b); row = await sync(a);
  check(row.data.foods[0].name, 'B edited', 'B to A via database');
  check((await sync(outsider)).data.foods, [], 'different UID receives no records');
  for (const isolatedScope of [{ ...scope, environment: 'preview' }, { ...scope, projectId: 'other-project' }]) check((await sqlStore.readState(isolatedScope)).records, [], 'environment and project isolate same UID rows');
  a.offline(true); await a.commit(data => { data.foods[0].name = 'offline one'; }); await a.commit(data => { data.foods[0].name = 'offline latest'; });
  await sync(a, 'offline'); const factory = a.indexedDB; a.close(); a = await device(deviceA, factory);
  check((await a.row()).outbox.length, 2, 'offline queue survives reload'); await sync(a); check((await sync(b)).data.foods[0].name, 'offline latest', 'offline chain reconnect');
  a.lost(); await a.commit(data => { data.foods[0].name = 'lost ack'; }); await sync(a, 'offline'); const frozen = (await a.row()).outbox[0].request;
  check((await sqlStore.lookupReceipt(scope, frozen.operationId)).status, 'applied', 'server commit survived lost acknowledgement');
  const lostFactory = a.indexedDB; a.close(); a = await device(deviceA, lostFactory); await sync(a);
  check((await a.row()).receipts.some(r => r.operationId === frozen.operationId), true, 'exact lost operation retired through complete feed');
  check((await sync(b)).data.foods[0].name, 'lost ack', 'lost ack reaches other device');
  for (const [winner, loser, label] of [[a, b, 'A wins'], [b, a, 'B wins']]) {
    await winner.commit(data => { data.foods[0].name = label; }); await loser.commit(data => { data.foods[0].name = 'local conflict'; });
    await sync(winner); row = await sync(loser, 'conflict');
    check(row.data.foods[0].name, 'local conflict', 'conflicting local candidate retained');
    check(row.conflicts.find(c => c.status === 'unresolved').remote[0].payload.name, label, 'remote candidate reviewed'); await resolveRemote(loser); await sync(winner);
  }
  await a.commit(data => { data.foods.push(food('tombstone')); }); await sync(a); await sync(b);
  await a.commit(data => { data.foods = data.foods.filter(f => f.id !== 'tombstone'); });
  await b.commit(data => { data.foods.find(f => f.id === 'tombstone').name = 'editing deleted'; }); await sync(a); row = await sync(b, 'conflict');
  check(row.conflicts.find(c => c.status === 'unresolved').remote[0].deleted, true, 'edit vs delete retains tombstone');
  const conflict = await b.engine.readConflict(row.conflicts.find(c => c.status === 'unresolved').id);
  check(await b.engine.resolveConflict(conflict.id, 'local', conflict.reviewToken), { applied: false, code: 'copy_required' }, 'old key cannot resurrect'); await resolveRemote(b);
  await a.commit(data => { data.foods.push(food('delete-edit')); }); await sync(a); await sync(b);
  await a.commit(data => { data.foods.find(f => f.id === 'delete-edit').name = 'remote edit'; });
  await b.commit(data => { data.foods = data.foods.filter(f => f.id !== 'delete-edit'); }); await sync(a); row = await sync(b, 'conflict');
  check(row.conflicts.find(c => c.status === 'unresolved').local, [null], 'delete candidate retained against edit'); await resolveRemote(b);
  const history = await sqlStore.readState(scope); const base = history.records.find(r => r.kind === 'food' && r.recordId === 'shared');
  const request = { protocolVersion: 1, commandType: 'update-records', operationId: randomUUID(), deviceId: deviceA, dependencies: [], changes: [{ kind: 'food', recordId: 'shared', action: 'update', baseRevision: base.revision, payloadSchema: 8, payload: { ...base.payload, calories: -1 } }] };
  const reject = await gateway.handle({ route: 'push', body: request, authorization: uid }); check(reject.status, 'rejected', 'database-backed domain rejection');
  check(await gateway.handle({ route: 'push', body: request, authorization: uid }), reject, 'rejected request exact retry');
  const legal = { ...request, operationId: randomUUID(), changes: [{ ...request.changes[0], payload: { ...base.payload, name: 'direct accepted' } }] };
  const applied = await gateway.handle({ route: 'push', body: legal, authorization: uid }); check(applied.status, 'applied', 'direct accepted CAS');
  check(await gateway.handle({ route: 'push', body: legal, authorization: uid }), applied, 'duplicate operation never repeats');
  const stale = { ...legal, operationId: randomUUID() }; check((await gateway.handle({ route: 'push', body: stale, authorization: uid })).status, 'conflict', 'real SQL stale CAS');
  const beforeMalformed = await b.row(); b.malformed(); await sync(b, 'error'); check((await b.row()).cursor, beforeMalformed.cursor, 'malformed group count advances no cursor'); await sync(b); await sync(a);
  await a.commit(data => { data.foods.push({ ...food('rejected-food'), name: '' }); }); row = await sync(a, 'conflict');
  check(row.outbox.length, 1, 'gateway rejection retains local intent'); check(row.data.foods.some(f => f.id === 'rejected-food'), true, 'rejected candidate remains locally recoverable');
  await resolveRemote(a);
  const fixtureDraft = representativeState().planningDraft;
  await a.commit(data => { data.planningDraft = fixtureDraft; }); await sync(a);
  await a.commit(data => { data.draft = createStartedSession({ workout: 'A', week: 1, date: '2026-10-09' }); data.planningDraft.builder = null; data.planningDraft.revision++; });
  row = await sync(a); check(row.outbox.length, 0, 'compound builder Start acknowledged');
  check(row.data.planningDraft.builder, null, 'planning clear accepted'); check(row.data.draft.historyEditBase, null, 'selected local live reconstructed');
  row = await sync(b); check(row.data.draft, null, 'other device never silently selects remote live'); check(row.data.planningDraft.builder, null, 'other device planning remains isolated');
  await a.commit(data => { applySessionCommand(data, data.draft, { type: 'log', slotId: data.draft.sessionStructure.slots[0].id, setNumber: 1, values: { weight: 20, reps: 8, rir: 2, unit: 'kg' } }); }); await sync(a);
  await a.commit(data => { applySessionCommand(data, data.draft, { type: 'complete' }); }); row = await sync(a);
  check(row.data.sessions.length, 1, 'completed workout synchronized'); check(row.data.draft, null, 'completed live selection cleared locally');
  await sync(b); await a.commit(data => { const source = data.sessions[0]; data.draft = { ...structuredClone(source), historyEditBase: createHistoryEditBase(source), notes: 'reviewed actualSQL correction' }; }); await sync(a);
  const correctionState = await sqlStore.readState(scope), sourceRecord = correctionState.records.find(r => r.kind === 'workout' && r.phase === 'completed'), candidateRecord = correctionState.records.find(r => r.kind === 'history_candidate' && !r.deleted);
  const completionPreview = structuredClone((await a.row()).data); applySessionCommand(completionPreview, completionPreview.draft, { type: 'complete' });
  const correctionRequest = { protocolVersion: 1, commandType: 'correct-history', deviceId: deviceA, operationId: randomUUID(), dependencies: [], changes: [
    { kind: 'workout', recordId: sourceRecord.recordId, action: 'update', baseRevision: sourceRecord.revision, payloadSchema: 8, phase: 'completed', payload: completionPreview.sessions[0] },
    { kind: 'history_candidate', recordId: candidateRecord.recordId, action: 'delete', baseRevision: candidateRecord.revision, payloadSchema: 8 }
  ] };
  for (const mutate of [payload => { payload.sessionStructure.revision += 1; }, payload => { payload.notes = 'unreviewed arbitrary content'; }, payload => { payload.updatedAt = 'not a timestamp'; }]) {
    const malicious = structuredClone(correctionRequest); malicious.operationId = randomUUID(); mutate(malicious.changes[0].payload);
    check((await gateway.handle({ route: 'push', body: malicious, authorization: uid })).status, 'rejected', 'correction rejects arbitrary revision/content/timestamp');
    check((await sqlStore.readState(scope)).headSequence, correctionState.headSequence, 'failed correction leaves candidate/source/head intact');
  }
  await a.commit(data => { applySessionCommand(data, data.draft, { type: 'complete' }); }); row = await sync(a);
  check(row.data.sessions[0].notes, 'reviewed actualSQL correction', 'history candidate/source correction accepted atomically');
  check((await sync(b)).data.sessions[0].notes, 'reviewed actualSQL correction', 'other device receives corrected snapshot');
  await a.commit(data => { const source = data.foods.find(f => f.id === 'shared'); data.entries.push({ id: 'frozen-meal', date: '2026-10-09', meal: 'Lunch', servings: 1, foodId: source.id, food: { name: source.name, serving: source.serving, calories: source.calories, protein: source.protein, carbs: source.carbs, fat: source.fat } }); }); await sync(a); await sync(b);
  const frozenMacros = structuredClone((await b.row()).data.entries[0].food);
  await a.commit(data => { data.foods.find(f => f.id === 'shared').calories = 700; }); await sync(a); check((await sync(b)).data.entries[0].food, frozenMacros, 'food editing preserves historical meal snapshot');
  const snapshot = await gateway.handle({ route: 'bootstrap', body: { headSequence: null, cursor: null, limit: 1 }, authorization: uid });
  check(typeof snapshot.snapshotRecordCount, 'number', 'bootstrap carries exact stable count');
  const later = { ...legal, operationId: randomUUID(), changes: [{ ...legal.changes[0], baseRevision: (await sqlStore.readState(scope)).records.find(r => r.kind === 'food' && r.recordId === 'shared').revision }] };
  await gateway.handle({ route: 'push', body: later, authorization: uid });
  const next = await gateway.handle({ route: 'bootstrap', body: { headSequence: snapshot.headSequence, cursor: snapshot.cursor, limit: 1 }, authorization: uid });
  check(next.headSequence, snapshot.headSequence, 'snapshot H fixed while server writes'); check(next.snapshotRecordCount, snapshot.snapshotRecordCount, 'snapshot count fixed while server writes');
  // Actual UI-store boundary: the visible editor and SessionStore baseline stay
  // pre-ACK while accepted IndexedDB data acquires JSONB object-key ordering.
  // Replacing visible data with the newest row before each command would conceal
  // the false-stale bug this regression must reproduce.
  const uiScope = { ...scope, uid: other }; let visible = (await outsider.row()).data;
  const writeVisible = async change => (await outsider.store.commit(uiScope, change, visible)).data;
  const planning = createDraftStore({ getData: () => visible, write: async change => { const nextData = await writeVisible(change); visible = nextData; return nextData; } });
  const sessionUiStore = createSessionStore({ getData: () => visible, write: writeVisible, acceptData: nextData => { visible = nextData; }, commitPlanning: (kind, change) => planning.commit(kind, change) });
  await sessionUiStore.start({ workout: 'A', date: '2026-10-10', week: 1 }, visible.draft);
  const preAckStarted = structuredClone(visible.draft); await sync(outsider);
  check(JSON.stringify((await outsider.row()).data.draft) === JSON.stringify(preAckStarted), false, 'actual SQL changed object-key order after Start acknowledgement');
  check(visible.draft, preAckStarted, 'visible editor stays pre-ACK');
  const logSet = number => ({ type: 'log', slotId: visible.draft.sessionStructure.slots[0].id, setNumber: number, values: { weight: 25, reps: 9, rir: 2, unit: 'kg' } });
  await sessionUiStore.command(logSet(1), visible.draft); check(visible.draft.sets.length, 1, 'actual SessionStore first log works after own ACK'); await sync(outsider);
  await sessionUiStore.command(logSet(2), visible.draft); check(visible.draft.sets.length, 2, 'actual SessionStore second log works after another own ACK'); await sync(outsider);
  await sessionUiStore.command({ type: 'complete' }, visible.draft); check(visible.draft, null, 'actual SessionStore Complete works against post-ACK database'); await sync(outsider);
  check((await outsider.row()).data.sessions[0].sets.length, 2, 'actual completed history retains both acknowledged sets');
  const firstBuilder = structuredClone(representativeState().planningDraft.builder.payload);
  await planning.save('builder', firstBuilder); const preAckPlanning = structuredClone(visible.planningDraft); await sync(outsider);
  check(JSON.stringify((await outsider.row()).data.planningDraft) === JSON.stringify(preAckPlanning), false, 'actual SQL reordered planning envelope keys');
  const secondBuilder = structuredClone(firstBuilder); secondBuilder.day.name = 'Visible second planning write';
  await planning.save('builder', secondBuilder); await sync(outsider);
  check((await outsider.row()).data.planningDraft.builder.payload.day.name, secondBuilder.day.name, 'second planning write works with pre-ACK visible baseline');
  a.close(); b.close(); outsider.close();
  process.stdout.write(`PASS ${assertions} Batch2 real PostgreSQL WASM + isolated IDB assertions. Supabase, real HTTP/Auth and native multi-connection concurrency NOT VERIFIED.\n`);
} finally { await db.close(); }
