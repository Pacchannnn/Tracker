import test from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from '../js/session-runtime.js';
import { emptyData, loadData, updateData, createBackup, parseBackup, STORAGE_KEY } from '../js/data.js';
import { createDraftStore } from '../js/planning-draft.js';
import { representativeState } from './fixtures/representative-state.js';
import { materializeLegacySession, validateSessionIdentity } from '../js/session-identity.js';

function harness(initial = emptyData()) {
  let raw = JSON.stringify(initial), fail = false, writes = 0, lockQueue = Promise.resolve();
  const storage = { getItem: () => raw, setItem: (_, value) => { if (fail) throw new Error('quota'); raw = value; writes++; } };
  const locks = { request: (name, change) => { assert.equal(name, 'vshape-tracker-write'); const op = lockQueue.then(change); lockQueue = op.catch(() => {}); return op; } };
  const client = () => {
    let data = loadData(storage);
    const write = change => updateData(storage, locks, change);
    const planning = createDraftStore({ getData: () => data, write: async change => data = await write(change) });
    const store = runtime.createSessionStore({ getData: () => data, write, acceptData: next => data = next,
      commitPlanning: (kind, change) => planning.commit(kind, change) });
    return { store, planning, get: () => data, refresh() { data = loadData(storage); store.reset(); } };
  };
  return { storage, client, disk: () => loadData(storage), raw: () => raw, writes: () => writes, fail: value => fail = value };
}
const values = { weight: 20, unit: 'kg', reps: 10, rir: 2 };
const log = (session, number = 1, index = 0) => ({ type: 'log', slotId: session.sessionStructure.slots[index].id, setNumber: number, values });
const legacy = () => ({ id: 'legacy', workout: 'A', date: '2026-10-05', week: 1, notes: '', sets: [{ id: 'old-set', exerciseIndex: 0, exerciseName: 'Lat pulldown, tay cầm thoải mái', setNumber: 9, ...values }] });

test('Original/custom/one-off Start creates frozen structured occurrences revision0 in a single write; source unchanged', async () => {
  for (const spec of [{ workout: 'A' }, { workout: 'CUSTOM', workoutSnapshot: representativeState().draft.workoutSnapshot },
    { workout: 'CUSTOM', workoutSnapshot: { ...representativeState().draft.workoutSnapshot, planId: null } }]) {
    const initial = representativeState(); initial.draft = null;
    const h = harness(initial), c = h.client();
    await c.store.start({ ...spec, date: '2026-10-05' }, c.get().draft);
    const s = h.disk().draft;
    assert.equal(s.sessionStructure.revision, 0); assert.equal(s.sessionStructure.basis, 'started');
    assert.equal(s.historyEditBase, null); validateSessionIdentity(s); assert.equal(h.writes(), 1);
    assert.deepEqual(h.disk().plans, initial.plans); assert.deepEqual(h.disk().sessions, initial.sessions);
    for (const slot of s.sessionStructure.slots) { assert.match(slot.id, /^[0-9a-f-]{36}$/i); assert.notEqual(slot.id, slot.sourceSlotId); }
  }
});

test('log/edit/delete/date/notes increments once and ownership stays immutable with order different from registry', async () => {
  const data = emptyData(); data.draft = runtime.createStartedSession({ workout: 'A', week: 1, date: '2026-10-05' });
  data.draft.sessionStructure.order.reverse();
  const h = harness(data), c = h.client(), slot = c.get().draft.sessionStructure.slots[0];
  await c.store.command(log(c.get().draft), c.get().draft);
  const saved = h.disk().draft.sets[0]; assert.equal(saved.slotId, slot.id); assert.equal(saved.exerciseIndex, 0);
  await c.store.command({ type: 'edit', setId: saved.id, slotId: slot.id, values: { ...values, weight: 22, slotId: 'injected' } }, c.get().draft);
  assert.deepEqual({ ...h.disk().draft.sets[0], weight: saved.weight }, saved);
  await c.store.command({ type: 'metadata', patch: { date: '2026-10-04' } }, c.get().draft);
  await c.store.command({ type: 'metadata', patch: { notes: 'changed' } }, c.get().draft);
  assert.equal(h.disk().draft.sessionStructure.revision, 4);
  await c.store.command({ type: 'delete', setId: saved.id, slotId: slot.id }, c.get().draft);
  assert.equal(h.disk().draft.sessionStructure.revision, 5); assert.equal(h.disk().draft.sets.length, 0);
});

test('duplicate exercise occurrences log separately; exact set ID/slot mismatch cannot edit or delete', async () => {
  const snapshot = representativeState().draft.workoutSnapshot;
  snapshot.exercises[1] = { ...snapshot.exercises[0], id: 'second-source' };
  const h = harness(), c = h.client(); await c.store.start({ workout: 'CUSTOM', workoutSnapshot: snapshot, date: '2026-10-05' }, null);
  await c.store.command(log(c.get().draft, 1, 0), c.get().draft);
  await c.store.command(log(c.get().draft, 1, 1), c.get().draft);
  const s = c.get().draft; assert.notEqual(s.sets[0].slotId, s.sets[1].slotId);
  await assert.rejects(c.store.command({ type: 'edit', setId: s.sets[0].id, slotId: s.sets[1].slotId, values }, s));
  await assert.rejects(c.store.command({ type: 'delete', setId: s.sets[0].id, slotId: s.sets[1].slotId }, s));
  assert.equal(h.disk().draft.sets.length, 2);
});

test('legacy load never writes; first mutation materializes/binds over-target sets and writes candidate exactly once', async () => {
  for (const draft of [legacy(), representativeState().sessions[0], { ...representativeState().sessions[0], workoutSnapshot: { ...representativeState().sessions[0].workoutSnapshot, planId: null } }]) {
    const data = emptyData(); data.draft = draft; const h = harness(data), c = h.client(), raw = h.raw();
    assert.equal(h.writes(), 0); assert.equal(h.raw(), raw);
    await c.store.command({ type: 'metadata', patch: { notes: 'first mutation' } }, c.get().draft);
    const s = h.disk().draft; assert.ok(s.sets.every(set => set.slotId)); assert.equal(s.sessionStructure.revision, 1);
    assert.deepEqual(s.sets.map(({slotId, ...set}) => set), draft.sets); assert.equal(h.writes(), 1);
  }
});

test('ambiguous legacy blocks new log; unique exact correction/date/notes retain raw ownership and remain legacy', async () => {
  const data = emptyData(); data.draft = legacy(); data.draft.sets[0].exerciseName = 'Unknown historical exercise';
  const h = harness(data), c = h.client(), before = h.raw();
  await assert.rejects(c.store.command({ type: 'log', slotId: 'legacy-slot:0', setNumber: 1, values }, c.get().draft), /mơ hồ/);
  assert.equal(h.raw(), before);
  await c.store.command({ type: 'edit', setId: 'old-set', slotId: null, values: { ...values, weight: 21 } }, c.get().draft);
  await c.store.command({ type: 'metadata', patch: { notes: 'preserved' } }, c.get().draft);
  assert.ok(!Object.hasOwn(h.disk().draft, 'sessionStructure')); assert.ok(!Object.hasOwn(h.disk().draft.sets[0], 'slotId'));
  assert.equal(h.disk().draft.sets[0].exerciseName, 'Unknown historical exercise');
});

test('quota during Start/materialization/log keeps original bytes and revisions; no Saved status', async () => {
  const data = emptyData(); data.draft = legacy(); const h = harness(data), c = h.client(), before = h.raw(); h.fail(true);
  await assert.rejects(c.store.command({ type: 'metadata', patch: { notes: 'not saved' } }, c.get().draft));
  assert.equal(h.raw(), before); assert.equal(c.store.status().state, 'error');
  await assert.rejects(c.store.start({ workout: 'B', date: '2026-10-05' }, c.get().draft)); assert.equal(h.raw(), before);
  h.fail(false); await c.store.command({ type: 'metadata', patch: { notes: 'saved' } }, c.get().draft);
  const structuredBefore = h.raw(); h.fail(true);
  await assert.rejects(c.store.command(log(c.get().draft), c.get().draft)); assert.equal(h.raw(), structuredBefore);
});

test('rapid same-tab distinct log commands serialize with updated own baseline; unrelated domains preserved', async () => {
  const h = harness(), c = h.client(); await c.store.start({ workout: 'A', date: '2026-10-05' }, null);
  const baseline = c.get().draft;
  await Promise.all([c.store.command(log(baseline, 1), baseline), c.store.command(log(baseline, 2), baseline)]);
  assert.equal(h.disk().draft.sets.length, 2); assert.equal(h.disk().draft.sessionStructure.revision, 2);
  const other = h.client(); await updateData(h.storage, { request: (_, work) => work() }, d => d.settings.protein = 130);
  await c.store.command({ type: 'metadata', patch: { notes: 'third' } }, c.get().draft);
  assert.equal(h.disk().settings.protein, 130); assert.equal(h.disk().draft.sessionStructure.revision, 3);
  assert.equal(other.get().draft.sessionStructure.revision, 2);
});

test('two clients same baseline: first wins; stale log/edit/delete/metadata/Complete/discard/start all reject', async () => {
  const h = harness(), a = h.client(); await a.store.start({ workout: 'A', date: '2026-10-05' }, null);
  await a.store.command(log(a.get().draft), a.get().draft); const b = h.client(), old = b.get().draft, set = old.sets[0];
  await a.store.command({ type: 'metadata', patch: { notes: 'A owns latest' } }, a.get().draft); const before = h.raw();
  for (const command of [log(old, 2), { type: 'edit', setId: set.id, slotId: set.slotId, values }, { type: 'delete', setId: set.id, slotId: set.slotId },
    { type: 'metadata', patch: { date: '2026-10-03' } }, { type: 'metadata', patch: { notes: 'stale' } }, { type: 'complete' }, { type: 'discard' }]) {
    await assert.rejects(b.store.command(command, old), /đổi|cũ/); assert.equal(h.raw(), before);
  }
  await assert.rejects(b.store.start({ workout: 'B', date: '2026-10-05' }, old)); assert.equal(h.raw(), before);
  b.refresh(); await b.store.command(log(b.get().draft, 2), b.get().draft); assert.equal(h.disk().draft.sets.length, 2);
});

test('same revision but different restored/old-writer baseline rejects; epoch cancels queued intent', async () => {
  const h = harness(), a = h.client(); await a.store.start({ workout: 'A', date: '2026-10-05' }, null);
  const baseline = a.get().draft;
  await updateData(h.storage, { request: (_, work) => work() }, d => d.draft.notes = 'old writer without revision');
  const before = h.raw(); await assert.rejects(a.store.command(log(baseline), baseline)); assert.equal(h.raw(), before);
  a.refresh(); const queued = a.store.command(log(a.get().draft), a.get().draft); a.store.reset();
  await assert.rejects(queued, /cũ|hủy/); assert.equal(h.raw(), before);
});

test('stale Complete/discard cannot affect switched draft and pending command never resurrects completed draft', async () => {
  const h = harness(), a = h.client(); await a.store.start({ workout: 'A', date: '2026-10-05' }, null);
  const b = h.client(), old = b.get().draft; await a.store.start({ workout: 'B', date: '2026-10-05' }, a.get().draft);
  for (const type of ['complete', 'discard']) await assert.rejects(b.store.command({ type }, old));
  assert.equal(h.disk().draft.workout, 'B');
  await a.store.command(log(a.get().draft), a.get().draft);
  const current = a.get().draft, finishing = a.store.command({ type: 'complete' }, current), late = a.store.command(log(current, 2), current);
  await finishing; await assert.rejects(late); assert.equal(h.disk().draft, null); assert.equal(h.disk().sessions.length, 1);
});

test('Complete increments revision, saves history and clears draft in one write; failed Complete retains draft', async () => {
  const h = harness(), c = h.client(); await c.store.start({ workout: 'A', date: '2026-10-05' }, null); await c.store.command(log(c.get().draft), c.get().draft);
  const before = h.raw(); h.fail(true); await assert.rejects(c.store.command({ type: 'complete' }, c.get().draft)); assert.equal(h.raw(), before);
  h.fail(false); const count = h.writes(); await c.store.command({ type: 'complete' }, c.get().draft);
  assert.equal(h.writes(), count + 1); assert.equal(h.disk().draft, null); assert.equal(h.disk().sessions[0].sessionStructure.revision, 2);
  assert.ok(!Object.hasOwn(h.disk().sessions[0], 'historyEditBase'));
});

test('history reopen preserves source, stores exact baseline across reload; successful Complete CAS strips baseline', async () => {
  const data = representativeState(); data.draft = null;
  const h = harness(data), c = h.client(), source = c.get().sessions[0];
  await c.store.reopen(source, null); assert.deepEqual(h.disk().sessions[0], source); assert.deepEqual(h.disk().draft.historyEditBase, source);
  const afterReload = h.client(), s = afterReload.get().draft, set = s.sets[0];
  await afterReload.store.command({ type: 'edit', slotId: set.slotId, setId: set.id, values: { ...values, reps: 11 } }, s);
  assert.deepEqual(h.disk().sessions[0], source);
  await afterReload.store.command({ type: 'complete' }, afterReload.get().draft);
  assert.equal(h.disk().sessions[0].sets[0].reps, 11); assert.ok(!Object.hasOwn(h.disk().sessions[0], 'historyEditBase'));
  assert.deepEqual(parseBackup(createBackup(h.disk())).data, h.disk());
});

for (const deleted of [false, true]) test(`history CAS rejects ${deleted ? 'deleted' : 'changed'} source and retains edited candidate`, async () => {
  const data = representativeState(); data.draft = null;
  const h = harness(data), c = h.client(); await c.store.reopen(c.get().sessions[0], null);
  await c.store.command({ type: 'metadata', patch: { notes: 'edited candidate' } }, c.get().draft);
  await updateData(h.storage, { request: (_, work) => work() }, next => { if (deleted) next.sessions = []; else next.sessions[0].notes = 'other client'; });
  const candidate = structuredClone(h.disk().draft), before = h.raw();
  await assert.rejects(c.store.command({ type: 'complete' }, c.get().draft), /lịch sử/);
  assert.equal(h.raw(), before); assert.deepEqual(h.disk().draft, candidate);
});

test('unprovable legacy history edit gets unknown marker; cannot overwrite source and can explicitly reopen latest', async () => {
  const data = representativeState(); data.draft = { ...structuredClone(data.sessions[0]), notes: 'old edited candidate' };
  const h = harness(data), c = h.client(); await c.store.command({ type: 'metadata', patch: { notes: 'candidate' } }, c.get().draft);
  assert.deepEqual(h.disk().draft.historyEditBase, { kind: 'legacy-unknown' });
  await assert.rejects(c.store.command({ type: 'complete' }, c.get().draft));
  const source = h.disk().sessions[0]; await c.store.reopen(source, c.get().draft);
  assert.deepEqual(h.disk().draft.historyEditBase, source); assert.equal(h.disk().draft.notes, source.notes);
});

test('reviewed independent recovery copy remaps all IDs/order/links/set owners and never resurrects source', async () => {
  const data = representativeState(), s = materializeLegacySession(data.sessions[0]).session;
  const predecessor = s.sessionStructure.slots[0], successor = structuredClone(predecessor); successor.id = 'successor'; successor.sourceSlotId = null; successor.replacesSlotId = predecessor.id;
  predecessor.status = 'replaced'; s.sessionStructure.slots.push(successor); s.sessionStructure.order.unshift(successor.id);
  data.draft = { ...s, historyEditBase: { kind: 'legacy-unknown' } }; data.sessions = [];
  const h = harness(data), c = h.client(), before = structuredClone(c.get().draft);
  await c.store.command({ type: 'copy-history' }, c.get().draft);
  const copy = h.disk().sessions[0]; validateSessionIdentity(copy); assert.equal(h.disk().draft, null);
  assert.notEqual(copy.id, before.id); assert.notEqual(copy.sets[0].id, before.sets[0].id);
  assert.ok(copy.sessionStructure.slots.every(slot => !before.sessionStructure.slots.some(old => old.id === slot.id)));
  assert.equal(copy.sessionStructure.order[0], copy.sessionStructure.slots.at(-1).id);
  assert.equal(copy.sessionStructure.slots.at(-1).replacesSlotId, copy.sessionStructure.slots[0].id);
  assert.equal(copy.sets[0].slotId, copy.sessionStructure.slots[0].id);
  assert.deepEqual(copy.sessionStructure.slots.map(slot => slot.snapshot), before.sessionStructure.slots.map(slot => slot.snapshot));
  assert.equal(copy.sets[0].weight, before.sets[0].weight); assert.equal(copy.workoutSnapshot.planId, before.workoutSnapshot.planId);
  assert.ok(!Object.hasOwn(copy, 'historyEditBase'));
});

test('planning Start cleanup is same atomic write, quota/conflict keeps both recoverable drafts', async () => {
  const data = representativeState(); data.draft = null;
  const h = harness(data), c = h.client(), spec = { workout: 'CUSTOM', workoutSnapshot: data.sessions[0].workoutSnapshot, date: '2026-10-05' };
  h.fail(true); await assert.rejects(c.store.start(spec, null, { planningKind: 'builder' })); assert.deepEqual(h.disk().planningDraft, data.planningDraft);
  h.fail(false); await c.store.start(spec, null, { planningKind: 'builder' });
  assert.equal(h.disk().planningDraft.builder, null); assert.deepEqual(h.disk().planningDraft.planner, data.planningDraft.planner);
  assert.equal(h.disk().draft.sessionStructure.basis, 'started'); assert.equal(h.writes(), 1);
});

test('queued command/Start capture immutable intent before caller changes its objects', async () => {
  const h = harness(), c = h.client(), spec = { workout: 'A', date: '2026-10-05' };
  const starting = c.store.start(spec, null); spec.workout = 'B'; await starting;
  assert.equal(h.disk().draft.workout, 'A');
  const command = log(c.get().draft), saving = c.store.command(command, c.get().draft); command.values = { ...values, weight: 999 };
  await saving; assert.equal(h.disk().draft.sets[0].weight, 20);
});

test('queued history reopen/delete capture reviewed source before caller mutates it', async () => {
  for (const method of ['reopen', 'removeHistory']) {
    const data = representativeState(); data.draft = null;
    const h = harness(data), c = h.client(), source = structuredClone(c.get().sessions[0]);
    const op = c.store[method](source, null); source.notes = 'changed caller object'; await op;
    if (method === 'reopen') assert.deepEqual(h.disk().draft.historyEditBase, data.sessions[0]);
    else assert.equal(h.disk().sessions.length, 0);
  }
});

test('invalid commands, revision overflow and duplicate rapid log leave persisted bytes intact', async () => {
  const h = harness(), c = h.client(); await c.store.start({ workout: 'A', date: '2026-10-05' }, null);
  for (const command of [{ ...log(c.get().draft), setNumber: 0 }, { ...log(c.get().draft), setNumber: 3 },
    { ...log(c.get().draft), values: { ...values, rir: 11 } }, { type: 'metadata', patch: { date: '2026-02-30' } }]) {
    const raw = h.raw(); await assert.rejects(c.store.command(command, c.get().draft)); assert.equal(h.raw(), raw);
  }
  const baseline = c.get().draft, first = c.store.command(log(baseline), baseline), second = c.store.command(log(baseline), baseline);
  const outcomes = await Promise.allSettled([first, second]); assert.equal(outcomes[0].status, 'fulfilled'); assert.equal(outcomes[1].status, 'rejected');
  assert.equal(h.disk().draft.sets.length, 1); assert.equal(h.disk().draft.sessionStructure.revision, 1);
  const data = h.disk(); data.draft.sessionStructure.revision = Number.MAX_SAFE_INTEGER;
  const full = harness(data), client = full.client(), raw = full.raw();
  await assert.rejects(client.store.command({ type: 'metadata', patch: { notes: 'overflow' } }, client.get().draft)); assert.equal(full.raw(), raw);
});

test('imported inactive slots disallow new logs but preserve exact corrections; backup keeps mixed history and baseline', async () => {
  const data = representativeState(); data.draft = materializeLegacySession(data.sessions[0]).session;
  data.draft.sessionStructure.slots[0].status = 'removed';
  const h = harness(data), c = h.client(), set = c.get().draft.sets[0];
  const raw = h.raw(); await assert.rejects(c.store.command(log(c.get().draft, 2), c.get().draft)); assert.equal(h.raw(), raw);
  await c.store.command({ type: 'edit', setId: set.id, slotId: set.slotId, values: { ...values, reps: 12 } }, c.get().draft);
  assert.equal(h.disk().draft.sets[0].reps, 12);
  assert.deepEqual(parseBackup(createBackup(h.disk())).data, h.disk());
  await c.store.command({ type: 'delete', setId: set.id, slotId: set.slotId }, c.get().draft); assert.equal(h.disk().draft.sets.length, 0);
});
