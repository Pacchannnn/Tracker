import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';
import { representativeState } from './fixtures/representative-state.js';
import { createStartedSession } from '../js/session-runtime.js';
import { recordsFromData, projectionFromRecords, diffRecords, buildLocalIntent } from '../js/cloud-records.js';

const device = '22222222-2222-4222-8222-222222222222';
test('cloud mapping roundtrips all schema8 aggregates without rewriting snapshots or legacy identity', () => {
  const data = representativeState();
  const records = recordsFromData(data, device);
  assert.deepEqual(projectionFromRecords(records, device, data.draft.id), data);
  assert.ok(records.every(r => r.payloadSchema === 8));
});
test('shared live payload strips null baseline and selection reconstructs it; other live workouts remain unselected', () => {
  const data = emptyData(); data.draft = createStartedSession({ workout: 'A', date: '2026-10-09', week: 1 });
  const selected = data.draft.id;
  const records = recordsFromData(data, device);
  assert.equal(Object.hasOwn(records.find(r => r.kind === 'workout').payload, 'historyEditBase'), false);
  assert.deepEqual(projectionFromRecords(records, device, selected).draft, data.draft);
  assert.equal(projectionFromRecords(records, device, null).draft, null);
});
test('history candidate is device scoped and source completed record is independent', () => {
  const data = emptyData(); const source = { id: 'old', workout: 'A', date: '2026-10-09', week: 1, sets: [] };
  data.sessions = [source]; data.draft = { ...source, notes: 'candidate', historyEditBase: structuredClone(source) };
  const records = recordsFromData(data, device), candidate = records.find(r => r.kind === 'history_candidate');
  assert.equal(candidate.payload.sourceSessionId, source.id);
  assert.deepEqual(projectionFromRecords(records, device, candidate.recordId), data);
  assert.equal(projectionFromRecords(records, '33333333-3333-4333-8333-333333333333', candidate.recordId).draft, null);
});
test('record diff preserves frozen macros when food changes and rejects invalid next data', () => {
  const before = representativeState(), after = structuredClone(before); after.foods[0].calories += 1;
  const changes = diffRecords(before, after, device);
  assert.equal(changes.length, 1); assert.equal(changes[0].kind, 'food');
  assert.deepEqual(after.entries, before.entries);
  after.settings.week = 99; assert.throws(() => diffRecords(before, after, device));
});
test('local intents retain baseline and depend on earlier queued writes without changing frozen requests', () => {
  const data = emptyData(), next = structuredClone(data); next.settings.week = 2;
  const shadow = recordsFromData(data, device).map(r => ({ ...r, revision: '1' }));
  const first = buildLocalIntent({ data, deviceId: device, shadow, outbox: [] }, next);
  assert.equal(first.commandType, 'update-planning'); assert.equal(first.changes[0].base.revision, '1');
  assert.equal(first.changes[0].before.revision, '1');
  first.request = { operationId: first.id, immutable: true }; first.state = 'sending';
  const later = structuredClone(next); later.settings.week = 3;
  const second = buildLocalIntent({ data: next, deviceId: device, shadow, outbox: [first] }, later);
  assert.deepEqual(second.dependsOn, [first.id]); assert.deepEqual(first.request, { operationId: first.id, immutable: true });
  assert.equal(second.changes[0].before.payload.settings.week, 2);
  assert.equal(buildLocalIntent({ data: later, deviceId: device, shadow, outbox: [] }, later), null);
});
test('valid ambiguous legacy history stays raw and roundtrips without guessed or fabricated structure', () => {
  const data = emptyData(); data.sessions.push({ id: 'legacy', workout: 'A', date: '2026-10-09', week: 1, sets: [{ id: 'set', exerciseIndex: 0, exerciseName: 'unresolved', setNumber: 1, weight: 20, reps: 8, rir: 2 }] });
  const before = structuredClone(data), records = recordsFromData(data, device);
  assert.deepEqual(projectionFromRecords(records, device), data); assert.deepEqual(data, before);
  assert.equal(Object.hasOwn(records.find(r => r.kind === 'workout').payload, 'sessionStructure'), false);
});
test('builder Start and draft clear stay a single supported planning operation', () => {
  const data = representativeState(); data.draft = null;
  const next = structuredClone(data); next.draft = createStartedSession({ workout: 'A', date: '2026-10-09', week: 1 });
  next.planningDraft.builder = null; next.planningDraft.revision++;
  const intent = buildLocalIntent({ data, deviceId: device, shadow: [], outbox: [] }, next);
  assert.equal(intent.commandType, 'update-planning'); assert.equal(intent.changes.length, 2);
  assert.deepEqual(intent.changes.map(c => [c.kind, c.action]).sort(), [['planning_draft', 'update'], ['workout', 'create']]);
});
test('history correction generates one compound operation; completion stays a phase transition on one session ID', () => {
  const source = representativeState().sessions[0], data = emptyData(); data.sessions = [source];
  data.draft = { ...structuredClone(source), historyEditBase: structuredClone(source), notes: 'reviewed correction' };
  const next = structuredClone(data); next.sessions[0] = { ...source, notes: 'reviewed correction' }; next.draft = null;
  const intent = buildLocalIntent({ data, deviceId: device, shadow: [], outbox: [] }, next);
  assert.equal(intent.commandType, 'correct-history'); assert.equal(intent.changes.length, 2);
  const started = emptyData(); started.draft = createStartedSession({ workout: 'A', date: '2026-10-09', week: 1 });
  const finished = structuredClone(started); const complete = { ...finished.draft }; delete complete.historyEditBase; finished.sessions.push(complete); finished.draft = null;
  const completion = buildLocalIntent({ data: started, deviceId: device, shadow: [], outbox: [] }, finished);
  assert.equal(completion.commandType, 'complete-workout'); assert.equal(completion.changes.length, 1);
  assert.equal(completion.changes[0].recordId, started.draft.id);
});
test('remote device planning draft is validated but never silently adopted into this device editor', () => {
  const data = representativeState(), remote = '33333333-3333-4333-8333-333333333333';
  const records = recordsFromData(data, remote);
  assert.deepEqual(projectionFromRecords(records, device).planningDraft, emptyData().planningDraft);
  assert.deepEqual(projectionFromRecords(records, remote).planningDraft, data.planningDraft);
  records.find(r => r.kind === 'planning_draft').payload.revision = -1;
  assert.throws(() => projectionFromRecords(records, device));
});
test('record ordering uses bigint position rather than timestamps and retains unknown payload fields', () => {
  const data = emptyData(), food = representativeState().foods[0];
  data.foods = [{ ...food, id: 'first', unknownLegacy: null }, { ...food, id: 'second', unknownLegacy: 0 }];
  const records = recordsFromData(data, device);
  const foods = records.filter(r => r.kind === 'food'); foods[0].position = '9007199254740992'; foods[1].position = '9007199254740993';
  assert.deepEqual(projectionFromRecords(records.reverse(), device).foods, data.foods);
  assert.equal(projectionFromRecords(records, device).foods[0].unknownLegacy, null);
  assert.equal(projectionFromRecords(records, device).foods[1].unknownLegacy, 0);
});
test('JSONB preference key order is reconstructed from exact immutable planner key without changing values', () => {
  const data = representativeState(), records = recordsFromData(data, device);
  const planner = records.find(r => r.kind === 'planning_draft').payload.planner.payload;
  planner.preferences = Object.fromEntries(Object.entries(planner.preferences).reverse());
  const projected = projectionFromRecords(records, device);
  assert.equal(JSON.stringify(projected.planningDraft.planner.payload.preferences), data.planningDraft.planner.payload.requestKey);
  assert.deepEqual(projected.planningDraft, data.planningDraft);
  planner.preferences.notes = 'tampered'; assert.throws(() => projectionFromRecords(records, device), /invalid_planner_request_key/);
  planner.preferences.notes = ''; planner.requestKey = 'broken'; assert.throws(() => projectionFromRecords(records, device), /invalid_planner_request_key/);
});
