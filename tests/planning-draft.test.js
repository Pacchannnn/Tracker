import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, loadData, updateData, saveData, createBackup, parseBackup, STORAGE_KEY } from '../js/data.js';
import * as drafts from '../js/planning-draft.js';

const builder = () => ({ day: { id: 'day1', name: 'Draft', exercises: [{ id: 's1', exerciseId: 'missing', name: 'Snapshot', sets: '', repMin: 'bad', repMax: '12', targetRIR: '', restSeconds: '90', notes: 'setup' }] }, source: null });
function harness() {
  const memory = new Map(); let fail = false;
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => { if (fail) throw new Error('quota'); memory.set(key, value); } };
  let queue = Promise.resolve();
  const locks = { request: (_, work) => { const result = queue.then(work); queue = result.catch(() => {}); return result; } };
  saveData(storage, emptyData());
  const client = () => { let data = loadData(storage); return drafts.createDraftStore({ getData: () => data, write: async change => data = await updateData(storage, locks, change) }); };
  return { storage, locks, client, failure: value => fail = value };
}

test('schema6 migrates additively and migration does not rewrite storage', () => {
  const old = { ...emptyData(), schemaVersion: 6 }; delete old.planningDraft;
  old.settings.week = 5; old.exerciseNotes = { 'A:0': 'keep' };
  const h = harness(); h.storage.setItem(STORAGE_KEY, JSON.stringify(old));
  const next = loadData(h.storage);
  assert.equal(next.schemaVersion, 7);
  assert.deepEqual(next.planningDraft, { revision: 0, builder: null, planner: null });
  for (const key of Object.keys(old).filter(key => key !== 'schemaVersion')) assert.deepEqual(next[key], old[key]);
  assert.equal(JSON.parse(h.storage.getItem(STORAGE_KEY)).schemaVersion, 6);
  assert.deepEqual(parseBackup(JSON.stringify(old)).data, next);
});

test('raw builder autosave recovers invalid input and discard survives reload', async () => {
  const h = harness(), a = h.client();
  await a.save('builder', builder());
  assert.equal(a.status().state, 'saved');
  const b = h.client();
  assert.deepEqual(b.recover('builder').payload, builder());
  assert.ok(b.recover('builder').savedAt);
  await b.discard('builder');
  assert.equal(h.client().recover('builder'), null);
  assert.equal(loadData(h.storage).planningDraft.revision, 2);
});

test('planner preferences and result invalidate when request changes', async () => {
  const h = harness(), a = h.client();
  const preferences = { name: 'Local', count: '3', muscles: ['back'], equipment: [], include: [], exclude: [] };
  const payload = drafts.plannerPayload(preferences, null);
  await a.save('planner', payload);
  assert.deepEqual(h.client().recover('planner').payload.preferences, preferences);
  assert.equal(drafts.plannerPayload({ ...preferences, count: '4' }, { status: 'draft' }).result, null);
});

test('queued writes preserve latest input while another tab cannot overwrite stale revision', async () => {
  const h = harness(), a = h.client(), b = h.client();
  const first = a.save('builder', builder());
  const second = a.save('builder', { ...builder(), day: { ...builder().day, name: 'Latest' } });
  await Promise.all([first, second]);
  await assert.rejects(b.save('builder', builder()), /tab khác/);
  assert.equal(b.status().state, 'error');
  assert.equal(loadData(h.storage).planningDraft.builder.payload.day.name, 'Latest');
  await updateData(h.storage, h.locks, next => next.settings.week = 2);
  await a.save('planner', drafts.plannerPayload({ notes: 'keep', muscles: [], equipment: [], include: [], exclude: [] }, null));
  assert.equal(loadData(h.storage).settings.week, 2);
  assert.equal(loadData(h.storage).planningDraft.builder.payload.day.name, 'Latest');
});

test('quota and failed Start/Save keep saved draft and never emit success', async () => {
  const h = harness(), a = h.client(); await a.save('builder', builder());
  const before = h.storage.getItem(STORAGE_KEY);
  h.failure(true);
  await assert.rejects(a.save('builder', { ...builder(), day: { ...builder().day, name: 'Unsaved' } }));
  assert.equal(a.status().state, 'error'); assert.equal(h.storage.getItem(STORAGE_KEY), before);
  h.failure(false);
  await assert.rejects(a.commit('builder', () => { throw new Error('invalid Start'); }));
  assert.equal(h.storage.getItem(STORAGE_KEY), before);
  await a.commit('builder', next => { next.settings.week = 3; });
  assert.equal(loadData(h.storage).planningDraft.builder, null);
  assert.equal(loadData(h.storage).settings.week, 3);
});

test('corrupt draft is recoverable without erasing disk and bad imports reject', async () => {
  const h = harness(); const state = emptyData();
  state.planningDraft.builder = { savedAt: 'bad', payload: { day: 'bad' } };
  h.storage.setItem(STORAGE_KEY, JSON.stringify(state));
  const before = h.storage.getItem(STORAGE_KEY), a = h.client();
  assert.throws(() => a.recover('builder'), /nháp/);
  assert.equal(h.storage.getItem(STORAGE_KEY), before);
  assert.throws(() => createBackup(state), /nháp/);
  assert.throws(() => parseBackup(JSON.stringify(state)), /nháp/);
  await a.discard('builder'); assert.equal(loadData(h.storage).planningDraft.builder, null);
});

test('bounded draft rejects excess size without discarding last saved draft', async () => {
  const h = harness(), a = h.client(); await a.save('builder', builder());
  const before = h.storage.getItem(STORAGE_KEY);
  await assert.rejects(a.save('builder', { ...builder(), day: { ...builder().day, name: 'x'.repeat(250001) } }), /nháp/);
  assert.equal(h.storage.getItem(STORAGE_KEY), before);
});
