import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, loadData, updateData, createBackup, parseBackup, STORAGE_KEY, SCHEMA_VERSION } from '../js/data.js';
import { representativeState } from './fixtures/representative-state.js';
import * as identity from '../js/session-identity.js';
const locks = { request: (_, work) => work() };
const storageFor = data => { let raw = JSON.stringify(data), writes = 0; return { getItem: () => raw, setItem: (_, value) => { raw = value; writes++; }, writes: () => writes }; };

test('V7 to V8 is additive for every domain and completed record; load twice never writes, first successful legacy write persists 8', async () => {
  const old = { ...representativeState(), schemaVersion: 7 }, storage = storageFor(old), before = storage.getItem();
  const a = loadData(storage), b = loadData(storage);
  assert.equal(SCHEMA_VERSION, 8); assert.equal(a.schemaVersion, 8);
  assert.deepEqual(a, b);
  for (const key of Object.keys(old).filter(k => k !== 'schemaVersion')) assert.deepEqual(a[key], old[key]);
  assert.equal(storage.writes(), 0); assert.equal(storage.getItem(), before);
  const next = await updateData(storage, locks, data => data.draft.notes = 'legacy writer');
  assert.equal(JSON.parse(storage.getItem()).schemaVersion, 8);
  assert.equal(storage.writes(), 1);
  assert.ok(!Object.hasOwn(next.draft, 'sessionStructure'));
  assert.ok(next.draft.sets.every(set => !Object.hasOwn(set, 'slotId')));
  assert.deepEqual(next.sessions, old.sessions);
  assert.deepEqual(loadData(storage), next);
});

for (let version = 1; version <= 7; version++) test(`raw and wrapped V${version} backup/load chain reaches V8 preserving present domains`, () => {
  const old = { ...representativeState(), schemaVersion: version };
  for (const [introduced, keys] of [[2, ['exerciseNotes']], [3, ['cardioEntries','kneeEntries']], [4, ['savedMeals','recipes']], [5, ['journalEntries']], [6, ['customExercises','plans','activePlanId']], [7, ['planningDraft']]]) {
    if (version < introduced) keys.forEach(key => delete old[key]);
  }
  const store = storageFor(old), result = loadData(store);
  assert.equal(result.schemaVersion, 8);
  for (const key of Object.keys(old).filter(k => k !== 'schemaVersion')) assert.deepEqual(result[key], old[key]);
  for (const input of [old, { schemaVersion: version, data: old }]) assert.deepEqual(parseBackup(JSON.stringify(input)).data, result);
  assert.equal(store.writes(), 0);
});

test('V8 backup roundtrip preserves mixed generations, tombstones, links, order, revision and editing baseline', () => {
  const data = representativeState(), materialized = identity.materializeLegacySession(data.draft).session;
  const slot = materialized.sessionStructure.slots[0];
  const successor = structuredClone(slot); successor.id = 'successor'; successor.sourceSlotId = null; successor.replacesSlotId = slot.id; successor.status = 'removed';
  slot.status = 'replaced'; materialized.sessionStructure.slots.push(successor);
  materialized.sessionStructure.order.unshift(successor.id); materialized.sessionStructure.revision = 9;
  data.sessions.push({ ...structuredClone(materialized), id: 'structured-completed' });
  data.draft = { ...materialized, id: 'structured-completed', historyEditBase: identity.createHistoryEditBase(data.sessions.at(-1)) };
  assert.deepEqual(parseBackup(createBackup(data)).data, data);
  assert.ok(!Object.hasOwn(data.sessions[0], 'sessionStructure'));
});

test('malformed structure fails load/write/export/import without changing disk; future and wrapper mismatch reject', async () => {
  const data = representativeState(); data.draft = identity.materializeLegacySession(data.sessions[0]).session;
  const store = storageFor(data), before = store.getItem();
  await assert.rejects(updateData(store, locks, next => delete next.draft.sets[0].slotId));
  assert.equal(store.getItem(), before);
  delete data.draft.sets[0].slotId;
  assert.throws(() => createBackup(data)); assert.throws(() => parseBackup(JSON.stringify(data)));
  const broken = storageFor(data); assert.throws(() => loadData(broken)); assert.equal(broken.writes(), 0);
  const future = storageFor({ ...emptyData(), schemaVersion: 9 }); assert.throws(() => loadData(future)); assert.equal(future.writes(), 0);
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 7, data: emptyData() })));
  assert.throws(() => parseBackup(JSON.stringify({ ...emptyData(), schemaVersion: 9 })));
});

test('ambiguous legacy Original history/draft survives load, unrelated-domain writes and backup without guessed ownership', async () => {
  const data = representativeState(); data.draft = { id: 'ambiguous', workout: 'A', date: '2026-10-05', week: 1, notes: '', sets: [{ id: 'overrun', exerciseIndex: 999, exerciseName: 'old unknown name', setNumber: 50, weight: 0, reps: 1, rir: 0 }] };
  data.sessions.push(structuredClone(data.draft)); data.schemaVersion = 7;
  const store = storageFor(data), next = await updateData(store, locks, d => d.settings.protein = 130);
  assert.deepEqual(next.draft, data.draft); assert.deepEqual(next.sessions, data.sessions);
  assert.equal(identity.materializeLegacySession(next.draft).kind, 'ambiguous');
  assert.deepEqual(parseBackup(createBackup(next)).data.draft, data.draft);
});

test('historyEditBase is draft-only; protected legacy edit drafts remain backup compatible without changing runtime writers', () => {
  const data = representativeState();
  data.draft = { ...structuredClone(data.sessions[0]), historyEditBase: identity.createHistoryEditBase(data.sessions[0]) };
  assert.deepEqual(parseBackup(createBackup(data)).data, data);
  data.sessions[0].historyEditBase = null;
  assert.throws(() => createBackup(data));
});

test('failed V7 migration validation and first-write quota leave original V7 bytes intact', async () => {
  const old = { ...representativeState(), schemaVersion: 7 }, store = storageFor(old), raw = store.getItem();
  const quota = { getItem: store.getItem, setItem() { throw new Error('quota'); } };
  await assert.rejects(updateData(quota, locks, data => data.settings.week = 3), /Không thể lưu/);
  assert.equal(store.getItem(), raw);
  const broken = { ...old, activePlanId: 'missing-plan' }, brokenStore = storageFor(broken), before = brokenStore.getItem();
  assert.throws(() => loadData(brokenStore));
  assert.equal(brokenStore.getItem(), before); assert.equal(brokenStore.writes(), 0);
});
