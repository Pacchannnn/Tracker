import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../js/cloud-import-preview.js').catch(() => ({}));
const scope = { uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' };
const preview = (...args) => { assert.equal(typeof module.prepareImportPreview, 'function'); return module.prepareImportPreview(...args); };
test('import preparation preserves exact payloads and source without assigning account ownership', () => {
  const source = { schemaVersion: 8, foods: [{ id: 'legacy-id', name: '<script>text</script>', unknown: null, macros: 0 }], sessions: [] };
  const original = structuredClone(source);
  const result = preview(source, { foods: [] }, [], scope);
  assert.deepEqual(source, original); assert.deepEqual(result.candidates[0].payload, source.foods[0]);
  assert.equal(result.candidates[0].kind, 'food'); assert.equal(result.jsonBytes, new TextEncoder().encode(JSON.stringify(source)).length);
  assert.equal(result.photoCount, 0); assert.equal(result.photoBytes, 0); assert.equal(result.ledgerContract.targetUID, scope.uid);
  assert.equal(result.ledgerContract.state, 'preview-only'); assert.equal(result.ledgerContract.sourceHash, null);
  result.candidates[0].payload.name = 'Changed preview'; assert.deepEqual(source, original);
});
test('same IDs and duplicate journal dates are review conflicts even when payloads match', () => {
  const source = { schemaVersion: 8, foods: [{ id: 'f', name: 'Food' }], journalEntries: [{ id: 'local', date: '2026-10-09' }] };
  const account = { foods: [{ id: 'f', name: 'Food' }], journalEntries: [{ id: 'remote', date: '2026-10-09' }] };
  const result = preview(source, account, [], scope);
  assert.equal(result.duplicates.length, 1); assert.equal(result.duplicates[0].samePayload, true);
  assert.ok(result.ambiguities.some(item => item.reason === 'journal-date-collision')); assert.equal(result.candidates.length, 0);
});
test('unknown schema, missing IDs, duplicate IDs, device drafts and unknown top-level fields stay visible for review', () => {
  const source = { schemaVersion: 3, foods: [{ name: 'Missing id' }, { id: 'f' }, { id: 'f' }], future: { private: 'retain' }, draft: { workout: 'unknown' } };
  const result = preview(source, {}, [], scope);
  for (const reason of ['unsupported-schema', 'missing-id', 'duplicate-source-id', 'unknown-field', 'device-ownership-required']) assert.ok(result.ambiguities.some(item => item.reason === reason), reason);
  assert.equal(result.ledgerContract.readyToImport, false); assert.deepEqual(source.future, { private: 'retain' });
});
test('photo counts never fabricate unknown byte sizes or silently assign orphan ownership', () => {
  const result = preview({ schemaVersion: 8, foods: [] }, {}, [{ id: 'p', ownerType: 'food', ownerId: 'gone' }], scope);
  assert.equal(result.photoCount, 1); assert.equal(result.photoBytes, null); assert.ok(result.ambiguities.some(item => item.reason === 'photo-owner-missing'));
  assert.equal(preview({ schemaVersion: 8 }, {}, null, scope).photoCount, null);
});
test('invalid scope and non-JSON payloads reject without normalization', () => {
  assert.throws(() => preview({}, {}, [], { ...scope, uid: 'email@example.invalid' }));
  assert.throws(() => preview({ schemaVersion: 8, foods: [{ id: 'f', invalid: NaN }] }, {}, [], scope));
  const cyclic = {}; cyclic.self = cyclic; assert.throws(() => preview(cyclic, {}, [], scope));
});
test('legacy workouts remain exact and require ownership review before any future import', () => {
  const session = { id: 's', workout: 'UNKNOWN', sets: [{ exerciseIndex: 1, weight: 0 }] };
  const result = preview({ schemaVersion: 8, sessions: [session] }, {}, [], scope);
  assert.deepEqual(result.ambiguities.find(item => item.reason === 'legacy-workout-ownership-review').payload, session);
  assert.equal(result.candidates.length, 0); assert.ok(!session.sessionStructure);
});
