import { prepareImportPreview } from './cloud-import-preview.js';
import { canonical } from './cloud-records.js';
import { scopeKey } from './cloud-store.js';
import { parsePhotoBackup } from './photo-backup.js';
import { recoverySHA256 } from './cloud-recovery.js';

const FORMAT = 'tracker-import-ledger';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const clone = value => structuredClone(value);
const same = (a, b) => canonical(a) === canonical(b);
const key = row => JSON.stringify([row.kind, row.recordId]);
const fail = code => { throw Error(code); };
// The portable schema8 note is a string; the account wire envelope is {text}.
// This known lossless mapping preserves the text and exact selected source.
function wireCandidate(candidate) {
  return candidate.kind === 'exercise_note' && typeof candidate.payload === 'string'
    ? { ...clone(candidate), payload: { text: candidate.payload } } : clone(candidate);
}
function json(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || seen.has(value) || !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) fail('invalid_import_ledger_json');
  seen.add(value); for (const child of Object.values(value)) json(child, seen); seen.delete(value);
}
function validate(ledger, target = {}) {
  json(ledger);
  if (!ledger || ledger.format !== FORMAT || ledger.version !== 1 || !UUID.test(ledger.importId) || ledger.id !== ledger.importId || !['review', 'planned', 'partial', 'accepted'].includes(ledger.state)
    || !UUID.test(ledger.target?.deviceId) || typeof ledger.source?.text !== 'string' || !HASH.test(ledger.source.sha256)
    || !['unresolved', 'mapping', 'batches', 'acceptedReceipts'].every(field => Array.isArray(ledger[field])) || !Array.isArray(ledger.preview?.candidates)
    || !Array.isArray(ledger.preview?.duplicates) || !Array.isArray(ledger.preview?.ambiguities)) fail('invalid_import_ledger');
  scopeKey(ledger.target.scope);
  if (scopeKey(ledger.scope) !== scopeKey(ledger.target.scope) || ledger.deviceId !== ledger.target.deviceId || !same(ledger.sourceHashes, { workspace: ledger.source.sha256, ...(ledger.source.photos ? { photos: ledger.source.photos.sha256 } : {}) })) fail('invalid_import_source_identity');
  if (target.scope && scopeKey(target.scope) !== scopeKey(ledger.target.scope) || target.deviceId && target.deviceId !== ledger.target.deviceId) fail('import_target_mismatch');
  const ids = new Set(), mappings = new Set();
  for (const batch of ledger.batches) {
    if (!UUID.test(batch.operationId) || ids.has(batch.operationId) || !HASH.test(batch.fingerprint) || !batch.request || batch.request.operationId !== batch.operationId
      || batch.request.deviceId !== ledger.target.deviceId || batch.request.protocolVersion !== 1 || batch.request.commandType !== 'import-records'
      || !Array.isArray(batch.request.changes) || batch.request.changes.length !== 1 || !Array.isArray(batch.dependsOn) || !Array.isArray(batch.assetDependencies)
      || batch.request.changes[0].action !== 'create' || batch.request.changes[0].baseRevision !== null || batch.request.changes[0].payloadSchema !== 8) fail('invalid_import_batch');
    const identity = key(batch.request.changes[0]);
    if (mappings.has(identity)) fail('duplicate_import_mapping'); mappings.add(identity); ids.add(batch.operationId);
  }
  for (const batch of ledger.batches) if (batch.dependsOn.some(id => !ids.has(id) || id === batch.operationId)) fail('invalid_import_dependencies');
  if (ledger.state === 'review' && (ledger.batches.length || ledger.acceptedReceipts.length) || ledger.state !== 'review' && ledger.unresolved.length) fail('invalid_import_state');
  const receiptIds = new Set();
  for (const receipt of ledger.acceptedReceipts) {
    const batch = ledger.batches.find(row => row.operationId === receipt.operationId);
    if (!batch || receiptIds.has(receipt.operationId)) fail('invalid_import_receipt');
    validateReceipt(batch, receipt.receipt); receiptIds.add(receipt.operationId);
  }
  if (ledger.state === 'accepted' && receiptIds.size !== ledger.batches.length || ledger.state === 'partial' && !receiptIds.size) fail('invalid_import_state');
  return ledger;
}
async function verifyBytes(ledger) {
  if (await recoverySHA256(ledger.source.text) !== ledger.source.sha256) fail('import_source_hash_mismatch');
  if (ledger.source.photos !== null && (typeof ledger.source.photos?.text !== 'string' || !HASH.test(ledger.source.photos?.sha256) || await recoverySHA256(ledger.source.photos.text) !== ledger.source.photos.sha256)) fail('import_photo_hash_mismatch');
  for (const batch of ledger.batches) if (await recoverySHA256(canonical(batch.request)) !== batch.fingerprint) fail('import_batch_fingerprint_mismatch');
  let source; try { source = JSON.parse(ledger.source.text); } catch { fail('invalid_import_source_json'); }
  let photoMetadata = ledger.photoMetadata;
  if (ledger.source.photos) {
    photoMetadata = parsePhotoBackup(ledger.source.photos.text).photos.map(({ blob, thumbnail, ...meta }) => ({ ...meta, byteSize: blob.size + thumbnail.size }));
    if (!same(photoMetadata, ledger.photoMetadata)) fail('import_source_inventory_mismatch');
  }
  const expected = prepareImportPreview(source, ledger.accountBaseline, photoMetadata, ledger.scope);
  if (!same(expected, ledger.preview)) fail('import_source_inventory_mismatch');
  for (const batch of ledger.batches) {
    const change = batch.request.changes[0], sourceCandidate = expected.candidates.find(row => key(row) === key(change));
    if (!sourceCandidate) fail('import_source_inventory_mismatch');
    if (batch.payloadMapping !== undefined && (batch.payloadMapping !== 'schema8-exercise-note-v1' || source.schemaVersion !== 8 || sourceCandidate.kind !== 'exercise_note' || typeof sourceCandidate.payload !== 'string')) fail('invalid_import_payload_mapping');
    const expectedPayload = batch.payloadMapping === 'schema8-exercise-note-v1' ? wireCandidate(sourceCandidate).payload : sourceCandidate.payload;
    if (!same(expectedPayload, change.payload)) fail('import_source_inventory_mismatch');
  }
}
function validateReceipt(batch, receipt) {
  const change = batch.request.changes[0];
  if (!receipt || receipt.operationId !== batch.operationId || receipt.status !== 'applied' || typeof receipt.commitSequence !== 'string' || !/^[1-9][0-9]*$/.test(receipt.commitSequence)
    || !Array.isArray(receipt.records) || receipt.records.length !== 1 || key(receipt.records[0]) !== key(change) || !same(receipt.records[0].payload, change.payload)) fail('invalid_import_receipt');
  const record = receipt.records[0];
  if (record.revision !== '1' || record.commitSequence !== receipt.commitSequence || record.payloadSchema !== 8 || record.deleted !== false
    || typeof record.position !== 'string' || !/^(0|[1-9][0-9]*)$/.test(record.position)
    || record.phase !== (change.kind === 'workout' ? change.phase : null)
    || record.deviceId !== (['planning_draft', 'history_candidate'].includes(change.kind) ? batch.request.deviceId : null)) fail('invalid_import_receipt');
}
export async function prepareImportLedger({ sourceText, photoText = null, accountData, photoMetadata, scope, deviceId, importId = crypto.randomUUID() } = {}) {
  scopeKey(scope);
  if (!UUID.test(deviceId) || !UUID.test(importId) || typeof sourceText !== 'string' || new TextEncoder().encode(sourceText).length > 10_000_000) fail('invalid_import_source');
  let anonymous; try { anonymous = JSON.parse(sourceText); } catch { fail('invalid_import_source_json'); }
  let photos = null;
  if (photoText !== null) {
    if (typeof photoText !== 'string' || new TextEncoder().encode(photoText).length > 280_000_000) fail('invalid_import_photos');
    const parsed = parsePhotoBackup(photoText);
    const metadata = parsed.photos.map(({ blob, thumbnail, ...meta }) => ({ ...meta, byteSize: blob.size + thumbnail.size }));
    if (photoMetadata !== undefined && !same(photoMetadata, metadata)) fail('import_photo_metadata_mismatch');
    photoMetadata = metadata;
    photos = { text: photoText, sha256: await recoverySHA256(photoText) };
  }
  const preview = prepareImportPreview(anonymous, accountData, photoMetadata, scope);
  const unresolved = [...preview.ambiguities, ...preview.duplicates.map(row => ({ ...row, reason: 'existing-id-collision' }))].map((row, index) => ({ ...row, reviewId: String(index) }));
  const sourceHash = await recoverySHA256(sourceText);
  const ledger = { format: FORMAT, version: 1, importId, id: importId, scope: clone(scope), deviceId, sourceHashes: { workspace: sourceHash, ...(photos ? { photos: photos.sha256 } : {}) }, state: 'review', target: { scope: clone(scope), deviceId }, source: { text: sourceText, sha256: sourceHash, photos },
    accountBaseline: clone(accountData), photoMetadata: clone(photoMetadata ?? null), preview, unresolved, mapping: [], batches: [], acceptedReceipts: [] };
  return clone(validate(ledger));
}
export async function planImportLedger(ledger, { decisions, consent, domainValidate } = {}) {
  validate(ledger); await verifyBytes(ledger);
  if (consent !== true) fail('explicit_import_consent_required');
  if (!Array.isArray(decisions) || typeof domainValidate !== 'function') fail('import_review_required');
  json(decisions);
  if (ledger.state !== 'review') {
    if (!same(ledger.mapping, decisions)) fail('immutable_import_mapping');
    return clone(ledger);
  }
  const decisionKeys = new Set();
  for (const decision of decisions) {
    const id = decision.reviewId !== undefined ? `review:${decision.reviewId}` : key(decision);
    if (decisionKeys.has(id)) fail('duplicate_import_decision'); decisionKeys.add(id);
    if (decision.reviewId !== undefined ? !ledger.unresolved.some(row => row.reviewId === decision.reviewId) : !ledger.preview.candidates.some(row => key(row) === key(decision))) fail('unknown_import_decision');
  }
  // Unknown data, collisions and old device ownership can only be kept local.
  // Transforming them requires a separate reviewed mapper, never normalization.
  for (const item of ledger.unresolved) if (!decisions.some(row => row.reviewId === item.reviewId && row.action === 'keep-local')) fail('import_review_required');
  const next = clone(ledger); next.mapping = clone(decisions); next.unresolved = [];
  for (const candidate of ledger.preview.candidates) {
    const decision = decisions.find(row => row.reviewId === undefined && key(row) === key(candidate));
    if (!decision || !['import', 'keep-local'].includes(decision.action)) fail('import_review_required');
    if (decision.action === 'keep-local') continue;
    const wire = wireCandidate(candidate);
    if (await domainValidate(wire, clone(ledger)) !== true) fail('import_domain_validation_failed');
    const operationId = crypto.randomUUID();
    const request = { protocolVersion: 1, commandType: 'import-records', deviceId: ledger.target.deviceId, operationId, dependencies: [],
      changes: [{ kind: candidate.kind, recordId: candidate.recordId, action: 'create', baseRevision: null, payloadSchema: 8, payload: clone(wire.payload) }] };
    if (candidate.kind === 'workout') request.changes[0].phase = 'completed';
    const assetDependencies = []; function photos(value) {
      if (!value || typeof value !== 'object') return;
      for (const [field, child] of Object.entries(value)) {
        if (field === 'photoId' && typeof child === 'string') assetDependencies.push(child);
        if (field === 'photoIds' && Array.isArray(child)) assetDependencies.push(...child);
        photos(child);
      }
    }
    photos(candidate.payload);
    const dependencies = [...new Set(assetDependencies)];
    if (dependencies.some(id => !ledger.source.photos || !ledger.photoMetadata?.some(photo => photo.id === id))) fail('import_photo_bytes_required');
    next.batches.push({ operationId, fingerprint: await recoverySHA256(canonical(request)), request, dependsOn: [], assetDependencies: dependencies,
      ...(candidate.kind === 'exercise_note' && typeof candidate.payload === 'string' ? { payloadMapping: 'schema8-exercise-note-v1' } : {}) });
  }
  next.state = next.batches.length ? 'planned' : 'accepted';
  return validate(next);
}
export function recordImportReceipt(ledger, operationId, receipt) {
  validate(ledger); json(receipt);
  const batch = ledger.batches.find(row => row.operationId === operationId);
  if (!batch) fail('unknown_import_operation'); validateReceipt(batch, receipt);
  const prior = ledger.acceptedReceipts.find(row => row.operationId === operationId);
  if (prior) { if (!same(prior.receipt, receipt)) fail('import_receipt_mismatch'); return clone(ledger); }
  const next = clone(ledger); next.acceptedReceipts.push({ operationId, fingerprint: batch.fingerprint, receipt: clone(receipt) });
  next.state = next.acceptedReceipts.length === next.batches.length ? 'accepted' : 'partial'; return validate(next);
}
export function serializeImportLedger(ledger) { return JSON.stringify(validate(ledger)); }
export async function parseImportLedger(text, target = {}) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 280_000_000) fail('import_ledger_size');
  let ledger; try { ledger = JSON.parse(text); } catch { fail('invalid_import_ledger_json'); }
  validate(ledger, target); await verifyBytes(ledger);
  return ledger;
}
