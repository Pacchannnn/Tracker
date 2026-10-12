import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPhotoBackup } from '../js/photo-backup.js';
const api = await import('../js/cloud-import-ledger.js').catch(() => ({}));
const scope = { uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' };
const deviceId = '22222222-2222-4222-8222-222222222222';
const sourceText = '{ "schemaVersion":8, "foods":[{"id":"legacy ID","name":"Food","snapshot":{"order":[3,1,2]}}] }';
const prepare = options => { assert.equal(typeof api.prepareImportLedger, 'function'); return api.prepareImportLedger({ sourceText, accountData: {}, photoMetadata: [], scope, deviceId, ...options }); };
test('ledger hashes exact selected bytes and preserves IDs, order and snapshots without preparing commands automatically', async () => {
  const ledger = await prepare();
  assert.equal(ledger.id, ledger.importId); assert.deepEqual(ledger.scope, scope); assert.equal(ledger.deviceId, deviceId);
  assert.equal(ledger.sourceHashes.workspace, createHash('sha256').update(sourceText).digest('hex'));
  assert.equal(ledger.source.text, sourceText); assert.equal(ledger.source.sha256, createHash('sha256').update(sourceText).digest('hex'));
  assert.equal(ledger.state, 'review'); assert.deepEqual(ledger.batches, []); assert.equal(ledger.target.deviceId, deviceId);
  assert.equal(ledger.preview.candidates[0].recordId, 'legacy ID'); assert.deepEqual(ledger.preview.candidates[0].payload.snapshot.order, [3, 1, 2]);
  const parsed = await api.parseImportLedger(api.serializeImportLedger(ledger), { scope, deviceId });
  assert.deepEqual(parsed, ledger);
});
test('a photo reference must match bytes in the selected source photo file', async () => {
  const blob = new Blob([Uint8Array.from([255, 216, 255, 217])], { type: 'image/jpeg' });
  const photoText = await createPhotoBackup([{ id: 'present', date: '2026-10-11', category: 'other', pose: '', weight: null, waist: null, note: '', createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z', blob, thumbnail: blob }]);
  const ledger = await prepare({ sourceText: '{"schemaVersion":8,"foods":[{"id":"f","photoId":"missing"}]}', photoMetadata: undefined, photoText });
  await assert.rejects(() => api.planImportLedger(ledger, { decisions: [{ kind: 'food', recordId: 'f', action: 'import' }], consent: true, domainValidate: () => true }), /photo_bytes/);
});
test('ledger parser rejects retargeted ownership, tampered source bytes and immutable request fingerprints', async () => {
  const ledger = await prepare();
  await assert.rejects(() => api.parseImportLedger(api.serializeImportLedger(ledger), { scope: { ...scope, projectId: 'other' }, deviceId }), /target/);
  const changedSource = structuredClone(ledger); changedSource.source.text += ' ';
  await assert.rejects(() => api.parseImportLedger(JSON.stringify(changedSource), { scope, deviceId }), /source_hash/);
  const planned = await api.planImportLedger(ledger, { decisions: [{ kind: 'food', recordId: 'legacy ID', action: 'import' }], consent: true, domainValidate: () => true });
  planned.batches[0].request.changes[0].payload.name = 'tampered';
  await assert.rejects(() => api.parseImportLedger(JSON.stringify(planned), { scope, deviceId }), /fingerprint/);
});
test('explicit reviewed plan freezes IDs and fingerprints so retry and receipt replay do not duplicate', async () => {
  const ledger = await prepare();
  const decisions = [{ kind: 'food', recordId: 'legacy ID', action: 'import' }];
  await assert.rejects(() => api.planImportLedger(ledger, { decisions, consent: false, domainValidate: () => true }), /consent/);
  const planned = await api.planImportLedger(ledger, { decisions, consent: true, domainValidate: () => true });
  const retry = await api.planImportLedger(planned, { decisions, consent: true, domainValidate: () => true });
  assert.deepEqual(retry, planned); assert.equal(planned.batches.length, 1); assert.equal(planned.batches[0].request.changes[0].recordId, 'legacy ID');
  const batch = planned.batches[0], receipt = { operationId: batch.operationId, status: 'applied', commitSequence: '1', records: [{ kind: 'food', recordId: 'legacy ID', payload: JSON.parse(sourceText).foods[0], revision: '1', commitSequence: '1', position: '0', payloadSchema: 8, deleted: false, phase: null, deviceId: null }] };
  const accepted = api.recordImportReceipt(planned, batch.operationId, receipt);
  assert.deepEqual(api.recordImportReceipt(accepted, batch.operationId, receipt), accepted);
  assert.throws(() => api.recordImportReceipt(accepted, batch.operationId, { ...receipt, commitSequence: '2' }), /receipt/);
  assert.deepEqual(ledger.batches, []);
});
test('modified preview cannot substitute payloads for the hashed selected source', async () => {
  const ledger = await prepare(); ledger.preview.candidates[0].payload.name = 'different';
  await assert.rejects(() => api.planImportLedger(ledger, { decisions: [{ kind: 'food', recordId: 'legacy ID', action: 'import' }], consent: true, domainValidate: () => true }), /source_inventory/);
});
test('an accepted import receipt must acknowledge the exact create revision and live payload', async () => {
  const planned = await api.planImportLedger(await prepare(), { decisions: [{ kind: 'food', recordId: 'legacy ID', action: 'import' }], consent: true, domainValidate: () => true });
  const batch = planned.batches[0], receipt = { operationId: batch.operationId, status: 'applied', commitSequence: '1', records: [{ kind: 'food', recordId: 'legacy ID', payload: JSON.parse(sourceText).foods[0], revision: '2', commitSequence: '1', position: '0', payloadSchema: 8, deleted: false, phase: null, deviceId: null }] };
  assert.throws(() => api.recordImportReceipt(planned, batch.operationId, receipt), /receipt/);
});
test('unknown fields, legacy ownership and ambiguous collisions block planning and preserve source', async () => {
  const ledger = await prepare({ sourceText: '{"schemaVersion":8,"future":{"private":"keep"},"sessions":[{"id":"s","sets":[]}],"foods":[{"id":"collision"}]}', accountData: { foods: [{ id: 'collision' }] } });
  assert.ok(ledger.unresolved.some(row => row.reason === 'unknown-field'));
  await assert.rejects(() => api.planImportLedger(ledger, { decisions: [], consent: true, domainValidate: () => true }), /review/);
  assert.equal(ledger.source.text.includes('"private":"keep"'), true);
});
