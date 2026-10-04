import test from 'node:test';
import assert from 'node:assert/strict';
import * as identity from '../js/session-identity.js';
import { programDay } from '../js/program.js';
import { representativeState } from './fixtures/representative-state.js';

const original = () => ({ id: 'session', workout: 'B', date: '2026-10-05', week: 1, notes: '', sets: [] });
const logged = (index, name, number = 1) => ({ id: `set-${index}-${number}`, exerciseIndex: index, exerciseName: name, setNumber: number, weight: 20, unit: 'kg', reps: 10, rir: 2 });
const structured = () => identity.materializeLegacySession(original()).session;

test('identity API distinguishes generations; legacy readers resolve without enriching input', () => {
  const s = original(), before = structuredClone(s);
  assert.equal(identity.sessionGeneration(s), 'legacy');
  assert.equal(identity.enumerateSessionSlots(s)[0].id, 'legacy-slot:0');
  assert.equal(identity.resolveSetOwner(s, logged(0, programDay('B', 1).exercises[0].name)).id, 'legacy-slot:0');
  assert.deepEqual(s, before);
});

test('Original materialization preserves exact week/ranges/unknowns, dedup catalog versus source and over-target sets', () => {
  for (const week of [1, 2, 3, 7, 12]) {
    const s = { ...original(), week }, day = programDay('B', week);
    s.sets = [logged(4, day.exercises[4].name, 9)];
    const before = structuredClone(s), a = identity.materializeLegacySession(s, { 'B:4': 'seat' });
    assert.equal(a.kind, 'materialized');
    assert.deepEqual(a, identity.materializeLegacySession(s, { 'B:4': 'seat' }));
    assert.equal(a.session.sessionStructure.basis, 'legacy-program');
    const slot = a.session.sessionStructure.slots[4];
    assert.equal(slot.exerciseId, 'original:A:3');
    assert.equal(slot.sourceSlotId, 'original:B:4');
    assert.deepEqual(slot.snapshot, { name: day.exercises[4].name, sets: day.exercises[4].sets, reps: day.exercises[4].reps, rest: day.exercises[4].rest, rir: day.exercises[4].rir, notes: day.exercises[4].note, setupNote: 'seat' });
    assert.deepEqual(a.session.sets[0], { ...s.sets[0], slotId: 'legacy-slot:4' });
    assert.deepEqual(s, before);
    identity.validateSessionIdentity(a.session);
  }
  const core = identity.materializeLegacySession({ ...original(), week: 4 }).session.sessionStructure.slots.at(-1);
  assert.equal(core.snapshot.rir, 'DATA NOT DEFINED YET');
});

test('custom and one-off frozen snapshots materialize deterministically with distinct same-exercise occurrences', () => {
  const s = representativeState().sessions[0];
  s.workoutSnapshot.exercises[1] = { ...s.workoutSnapshot.exercises[0], id: 'second-template-slot' };
  s.sets = [{ ...s.sets[0], id: 's0' }, { ...s.sets[0], id: 's1', exerciseIndex: 1 }];
  const before = structuredClone(s), a = identity.materializeLegacySession(s);
  assert.equal(a.kind, 'materialized');
  assert.deepEqual(a, identity.materializeLegacySession(s));
  assert.equal(a.session.sessionStructure.basis, 'legacy-snapshot');
  assert.equal(a.session.sessionStructure.slots[1].sourceSlotId, 'second-template-slot');
  assert.notEqual(a.session.sets[0].slotId, a.session.sets[1].slotId);
  assert.deepEqual(s, before);
  s.workoutSnapshot.planId = null;
  assert.equal(identity.materializeLegacySession(s).kind, 'materialized');
});

test('new structure occurrences use fresh UUIDs independent of source and immutable copied snapshots', () => {
  const s = representativeState().draft, a = identity.createSessionStructure(s), b = identity.createSessionStructure(s);
  assert.equal(a.basis, 'started');
  for (const slot of a.slots) {
    assert.match(slot.id, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    assert.notEqual(slot.id, slot.sourceSlotId);
    assert.notEqual(slot.id, slot.exerciseId);
    assert.throws(() => { slot.snapshot.name = 'mutated'; }, TypeError);
  }
  assert.notEqual(a.slots[0].id, b.slots[0].id);
  s.workoutSnapshot.exercises[0].name = 'changed source';
  assert.notEqual(a.slots[0].snapshot.name, 'changed source');
});

for (const [name, change] of [
  ['out-of-range', s => s.sets[0].exerciseIndex = 999],
  ['name conflict', s => s.sets[0].exerciseName = 'different'],
  ['duplicate set ID', s => s.sets.push({ ...s.sets[0], setNumber: 2 })],
  ['duplicate index/number', s => s.sets.push({ ...s.sets[0], id: 'another' })],
  ['missing definition', s => s.workout = 'missing'],
  ['unexpected ownership', s => s.sets[0].slotId = 'guess']
]) test(`ambiguous legacy ${name} preserves raw data and returns explicit reasons`, () => {
  const s = original(); s.sets = [logged(0, programDay('B', 1).exercises[0].name)]; change(s);
  const before = structuredClone(s), result = identity.materializeLegacySession(s);
  assert.equal(result.kind, 'ambiguous'); assert.ok(result.reasons.length);
  assert.deepEqual(result.session, before); assert.deepEqual(s, before);
  assert.throws(() => identity.enumerateSessionSlots(s), /identity/i);
});

test('order changes only display order; registry and set ownership stay unchanged', () => {
  const s = structured(), slot = s.sessionStructure.slots[0];
  s.sets = [{ ...logged(0, slot.snapshot.name), exerciseId: slot.exerciseId, slotId: slot.id }];
  const before = structuredClone(s);
  s.sessionStructure.order.reverse();
  identity.validateSessionIdentity(s);
  assert.deepEqual(s.sets, before.sets); assert.deepEqual(s.sessionStructure.slots, before.sessionStructure.slots);
  assert.equal(identity.resolveSetOwner(s, s.sets[0]).id, slot.id);
  assert.equal(identity.displaySessionSlots(s)[0].id, s.sessionStructure.order[0]);
  assert.equal(identity.lookupSessionSlot(s, slot.id).id, slot.id);
});

const badCases = [
  ['missing session ID', s => delete s.id],
  ['invalid date', s => s.date = '2026-02-31'],
  ['invalid week', s => s.week = 0],
  ['null structure', s => s.sessionStructure = null],
  ['revision', s => s.sessionStructure.revision = Number.MAX_SAFE_INTEGER + 1],
  ['negative revision', s => s.sessionStructure.revision = -1],
  ['basis', s => s.sessionStructure.basis = 'guessed'],
  ['status', s => s.sessionStructure.slots[0].status = 'deleted'],
  ['snapshot', s => s.sessionStructure.slots[0].snapshot.rest = 90],
  ['zero sets', s => s.sessionStructure.slots[0].snapshot.sets = 0],
  ['duplicate slot', s => s.sessionStructure.slots[1].id = s.sessionStructure.slots[0].id],
  ['missing order', s => s.sessionStructure.order.pop()],
  ['duplicate order', s => s.sessionStructure.order[1] = s.sessionStructure.order[0]],
  ['dangling owner', s => s.sets[0].slotId = 'missing'],
  ['half mix', s => delete s.sets[0].slotId],
  ['wrong ordinal', s => s.sets[0].exerciseIndex = 1],
  ['wrong name', s => s.sets[0].exerciseName = 'different'],
  ['wrong catalog ID', s => s.sets[0].exerciseId = 'different'],
  ['duplicate set ID', s => s.sets.push({ ...s.sets[0], setNumber: 2 })],
  ['duplicate owner/number', s => s.sets.push({ ...s.sets[0], id: 'another' })],
  ['dangling predecessor', s => s.sessionStructure.slots[1].replacesSlotId = 'missing'],
  ['cycle', s => { s.sessionStructure.slots[0].replacesSlotId = s.sessionStructure.slots[1].id; s.sessionStructure.slots[1].replacesSlotId = s.sessionStructure.slots[0].id; }],
  ['active predecessor', s => s.sessionStructure.slots[1].replacesSlotId = s.sessionStructure.slots[0].id],
  ['two successors', s => { s.sessionStructure.slots[0].status = 'replaced'; for (const slot of s.sessionStructure.slots.slice(1, 3)) slot.replacesSlotId = s.sessionStructure.slots[0].id; }],
  ['replaced without successor', s => s.sessionStructure.slots[0].status = 'replaced']
];
for (const [name, change] of badCases) test(`strict structured identity rejects ${name} without fallback`, () => {
  const s = structured(), slot = s.sessionStructure.slots[0];
  s.sets = [{ ...logged(0, slot.snapshot.name), exerciseId: slot.exerciseId, slotId: slot.id }];
  change(s); assert.throws(() => identity.validateSessionIdentity(s), /identity/i);
  assert.throws(() => identity.displaySessionSlots(s), /identity/i);
});

test('replacement links and removed zero-log rows survive; deleted source catalog is not required', () => {
  const s = structured(), slots = s.sessionStructure.slots;
  slots[0].status = 'replaced'; slots[1].replacesSlotId = slots[0].id; slots[1].status = 'removed';
  slots[1].exerciseId = 'deleted-custom'; slots[1].sourceSlotId = null;
  identity.validateSessionIdentity(s);
  assert.equal(identity.displaySessionSlots(s).length, slots.length);
});

test('history baseline clones source, null/unknown are explicit, recursion and mismatched IDs rejected', () => {
  const source = original(), base = identity.createHistoryEditBase(source), s = { ...source, historyEditBase: base };
  source.notes = 'changed'; assert.equal(base.notes, '');
  identity.validateSessionIdentity(s);
  assert.equal(identity.legacyHistoryEditBase(s, []), null);
  assert.deepEqual(identity.legacyHistoryEditBase(s, [source]), { kind: 'legacy-unknown' });
  identity.validateSessionIdentity({ ...s, historyEditBase: null });
  identity.validateSessionIdentity({ ...s, historyEditBase: { kind: 'legacy-unknown' } });
  assert.throws(() => identity.validateSessionIdentity({ ...s, historyEditBase: { ...base, historyEditBase: null } }));
  assert.throws(() => identity.validateSessionIdentity({ ...s, historyEditBase: { ...base, id: 'other' } }));
  assert.throws(() => identity.validateSessionIdentity({ ...s, historyEditBase: { ...base, date: '2026-02-31' } }));
});

test('identity adapters never accept a foreign set with a mismatched registry ordinal', () => {
  const s = structured(), owner = s.sessionStructure.slots[0];
  assert.throws(() => identity.resolveSetOwner(s, { ...logged(1, owner.snapshot.name), slotId: owner.id }));
});

test('structured custom snapshots are isolated from later template edits/deletion and keep unilateral/raw prescriptions', () => {
  const data = representativeState(), s = identity.materializeLegacySession(data.sessions[0]).session;
  const frozen = structuredClone(s); data.plans[0].days[0].exercises[0].sets = 20; data.plans = [];
  assert.deepEqual(s, frozen); identity.validateSessionIdentity(s);
  const originalD = identity.materializeLegacySession({ ...original(), workout: 'B', week: 4 }).session;
  assert.ok(originalD.sessionStructure.slots.some(slot => slot.snapshot.reps.includes('mỗi bên')));
  assert.ok(originalD.sessionStructure.slots.some(slot => slot.snapshot.rest.includes('–')));
});

test('compatibility bridge allows legacy writers only, including zero-log structured imports', () => {
  assert.equal(identity.legacyWriterAllowed(original()), true);
  assert.equal(identity.legacyWriterAllowed(structured()), false);
  assert.equal(identity.legacyWriterAllowed({ ...original(), sessionStructure: null }), false);
  assert.equal(identity.legacyWriterAllowed({ ...original(), historyEditBase: { kind: 'legacy-unknown' } }), false);
  assert.equal(identity.legacyWriterAllowed({ ...original(), historyEditBase: identity.createHistoryEditBase(original()) }), false);
  assert.equal(identity.legacyWriterAllowed({ ...original(), historyEditBase: null }), true);
});
