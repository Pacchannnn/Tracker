import { scopeKey } from './cloud-store.js';
import { canonical, validateAccountData, projectionFromRecords } from './cloud-records.js';
import { createPhotoBackup, parsePhotoBackup } from './photo-backup.js';
import { validateWirePhoto, validatePhotoAssetPath } from './cloud-photo.js';

const FORMAT = 'tracker-account-recovery';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const LIMITS = { workspace: 10_000_000, photos: 280_000_000, manifest: 10_000_000, asset: 20_000_000 };
const KINDS = new Set(['workout', 'history_candidate', 'planning_draft', 'plan', 'exercise', 'food', 'meal_entry', 'saved_meal', 'recipe', 'journal', 'checkin', 'cardio', 'knee', 'account_settings', 'exercise_note', 'photo']);
const SECRET_KEYS = new Set(['access_token', 'refresh_token', 'id_token', 'authorization', 'apikey', 'api_key', 'service_role_key', 'service_role', 'client_secret', 'authsession', 'auth_session', 'signedurl', 'signed_url']);
const bytes = text => new TextEncoder().encode(text);
const clone = value => structuredClone(value);
const same = (a, b) => canonical(a) === canonical(b);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw Error(code); };
const sequence = value => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && value.length <= 19 && BigInt(value) <= 9223372036854775807n;
export async function recoverySHA256(value) {
  const buffer = typeof value === 'string' ? bytes(value) : value instanceof Blob ? await value.arrayBuffer() : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(n => n.toString(16).padStart(2, '0')).join('');
}
function json(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || seen.has(value) || !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) fail('invalid_recovery_json');
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.has(key.toLowerCase())) fail('recovery_secret_field');
    json(child, seen);
  }
  seen.delete(value);
}
function accepted(records, head, deviceId) {
  const identities = new Set();
  if (!Array.isArray(records)) fail('invalid_recovery_records');
  for (const record of records) {
    const identity = JSON.stringify([record?.kind, record?.recordId]);
    if (!object(record) || !KINDS.has(record.kind) || typeof record.recordId !== 'string' || !record.recordId || identities.has(identity)
      || record.payloadSchema !== 8 || !object(record.payload) || typeof record.deleted !== 'boolean'
      || !sequence(record.revision) || record.revision === '0' || !sequence(record.commitSequence) || record.commitSequence === '0' || BigInt(record.commitSequence) > BigInt(head)
      || !sequence(record.position) || (record.kind === 'workout' ? !['live', 'completed'].includes(record.phase) : record.phase !== null)
      || (['planning_draft', 'history_candidate'].includes(record.kind) ? !UUID.test(record.deviceId) : record.deviceId !== null)) fail('invalid_recovery_records');
    projectionFromRecords([{...record,deleted:false}],record.deviceId??deviceId);
    identities.add(identity);
  }
}
function validateSnapshot(snapshot, scope) {
  if (!object(snapshot) || Object.keys(snapshot).some(key => !['workspace', 'assets', 'jobs', 'ledgers'].includes(key))
    || !['assets', 'jobs', 'ledgers'].every(key => Array.isArray(snapshot[key]))) fail('invalid_recovery_snapshot');
  const w = snapshot.workspace;
  json(w); json(snapshot.jobs); json(snapshot.ledgers);
  if (!object(w) || w.version !== 1 || scopeKey(w.scope) !== scopeKey(scope) || !UUID.test(w.deviceId)
    || !Number.isSafeInteger(w.localRevision) || w.localRevision < 0 || !sequence(w.cursor)
    || !['shadow', 'outbox', 'conflicts', 'receipts', 'syncReceipts'].every(key => Array.isArray(w[key]))) fail('invalid_recovery_workspace');
  if (w.initialized !== true || w.bootstrap !== null) fail('incomplete_recovery_workspace');
  validateAccountData(w.data); accepted(w.shadow, w.cursor, w.deviceId);
  function request(value, id, photo = false) {
    if (value === null) return;
    if (!object(value) || value.operationId !== id || value.deviceId !== w.deviceId || value.protocolVersion !== (photo ? 2 : 1)) fail('invalid_recovery_request');
    if (photo) {
      if (!['create', 'edit', 'replace', 'delete', 'delete-daily'].includes(value.action) || typeof value.recordId !== 'string' || !value.recordId) fail('invalid_recovery_request');
    } else {
      if (!['import-records', 'update-records', 'delete-records', 'update-planning', 'complete-workout', 'correct-history'].includes(value.commandType)
        || !Array.isArray(value.dependencies) || !Array.isArray(value.changes) || !value.changes.length || value.changes.length > 100) fail('invalid_recovery_request');
      const identities = new Set();
      for (const change of value.changes) {
        const identity = JSON.stringify([change?.kind, change?.recordId]);
        if (!object(change) || !KINDS.has(change.kind) || change.kind === 'photo' || typeof change.recordId !== 'string' || !change.recordId
          || identities.has(identity) || !['create', 'update', 'delete'].includes(change.action) || change.payloadSchema !== 8
          || (change.action === 'create' ? change.baseRevision !== null : !sequence(change.baseRevision) || change.baseRevision === '0')
          || change.action !== 'delete' && !object(change.payload)) fail('invalid_recovery_request');
        identities.add(identity);
      }
    }
  }
  for (const intent of w.outbox) {
    if (!object(intent) || !UUID.test(intent.id) || !Array.isArray(intent.changes) || !Array.isArray(intent.dependsOn) || intent.dependsOn.some(id => !UUID.test(id))) fail('invalid_recovery_outbox');
    request(intent.request, intent.id);
  }
  const jobIds = new Set();
  for (const job of snapshot.jobs) {
    if (!object(job) || !UUID.test(job.id) || jobIds.has(job.id) || scopeKey(job.scope) !== scopeKey(scope) || job.deviceId !== w.deviceId
      || !Number.isSafeInteger(job.localRevision) || job.localRevision < 1 || job.localRevision > w.localRevision
      || !['put', 'update', 'replace', 'delete', 'delete-daily'].includes(job.operation) || !['queued', 'sending', 'staged', 'conflict', 'failed', 'applied'].includes(job.state)
      || !Array.isArray(job.before) || !Array.isArray(job.after) || !Array.isArray(job.dependsOn) || job.dependsOn.some(id => !UUID.test(id))) fail('invalid_recovery_job');
    for (const meta of [...job.before, ...job.after]) validateWirePhoto(meta);
    if(job.operation==='delete-daily'&&(!object(job.journalBefore)||typeof job.journalBefore.id!=='string'||!job.journalBefore.id||job.after.length||job.before.some(meta=>meta.category!=='daily'||meta.date!==job.journalBefore.date)))fail('invalid_recovery_job');
    request(job.request, job.id, true); jobIds.add(job.id);
  }
  const ledgerIds = new Set();
  for (const ledger of snapshot.ledgers) {
    if (!object(ledger) || !UUID.test(ledger.id) || ledgerIds.has(ledger.id) || scopeKey(ledger.scope) !== scopeKey(scope) || ledger.deviceId !== w.deviceId
      || !object(ledger.sourceHashes) || Object.values(ledger.sourceHashes).some(hash => !HASH.test(hash))) fail('invalid_recovery_ledger');
    ledgerIds.add(ledger.id);
  }
}
function counts(snapshot) {
  const w = snapshot.workspace, acceptedCounts = {};
  for (const record of w.shadow) acceptedCounts[record.kind] = (acceptedCounts[record.kind] ?? 0) + 1;
  return { accepted: acceptedCounts, drafts: w.shadow.filter(r => ['planning_draft', 'history_candidate'].includes(r.kind) || r.kind === 'workout' && r.phase === 'live').length,
    outbox: w.outbox.length, conflicts: w.conflicts.length, receipts: w.receipts.length, syncReceipts: w.syncReceipts.length,
    assets: snapshot.assets.length, jobs: snapshot.jobs.length, ledgers: snapshot.ledgers.length };
}
async function verifiedAssets(snapshot) {
  const assets = new Map();
  function pathScope(path) {
    const parts = typeof path === 'string' ? path.split('/') : [];
    validatePhotoAssetPath(path, snapshot.workspace.scope, parts.at(-2), parts.at(-1)?.replace('.jpg', ''));
  }
  for (const asset of snapshot.assets) {
    if (!object(asset) || !UUID.test(asset.assetId) || assets.has(asset.assetId) || !HASH.test(asset.sha256) || asset.mime !== 'image/jpeg'
      || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > LIMITS.asset || !(asset.blob instanceof Blob) || asset.blob.type !== asset.mime || asset.blob.size !== asset.bytes) fail('invalid_recovery_asset');
    const metadata = { ...asset }; delete metadata.blob; json(metadata);
    if (asset.path !== undefined) pathScope(asset.path);
    const raw = new Uint8Array(await asset.blob.arrayBuffer());
    if (raw[0] !== 255 || raw[1] !== 216 || raw.at(-2) !== 255 || raw.at(-1) !== 217 || await recoverySHA256(raw) !== asset.sha256) fail('recovery_asset_hash');
    assets.set(asset.assetId, asset);
  }
  function references(value) {
    if (!value || typeof value !== 'object') return;
    if (Object.hasOwn(value, 'assetId')) {
      const asset = assets.get(value.assetId);
      if (!asset) fail('incomplete_recovery_asset');
      for (const field of ['sha256', 'bytes', 'mime']) if (Object.hasOwn(value, field) && value[field] !== asset[field]) fail('recovery_asset_reference_mismatch');
      if (value.path !== undefined) pathScope(value.path);
    }
    if (Array.isArray(value.assetIds)) for (const id of value.assetIds) if (!assets.has(id)) fail('incomplete_recovery_asset');
    for (const child of Object.values(value)) references(child);
  }
  references(snapshot.workspace); references(snapshot.jobs); references(snapshot.ledgers);
  return assets;
}
async function descriptor(name, text) { return { name, bytes: bytes(text).length, sha256: await recoverySHA256(text) }; }
function readFile(text, max, label) {
  if (typeof text !== 'string' || bytes(text).length > max) fail(`recovery_${label}_size`);
  let value; try { value = JSON.parse(text); } catch { fail(`invalid_recovery_${label}`); }
  json(value); return value;
}
function packAssets(assets, exportedAt) {
  const rows = [], inventory = [], list = [...assets.values()];
  for (let index = 0; index < list.length; index += 2) {
    const first = list[index], second = list[index + 1] ?? first, id = crypto.randomUUID();
    rows.push({ id, date: exportedAt.slice(0, 10), category: 'other', pose: '', weight: null, waist: null, note: '', createdAt: exportedAt, updatedAt: exportedAt, blob: first.blob, thumbnail: second.blob });
    for (const [asset, field] of [[first, 'blob'], ...(first === second ? [] : [[second, 'thumbnail']])]) {
      const metadata = { ...asset }; delete metadata.blob;
      inventory.push({ ...metadata, photo1Id: id, field });
    }
  }
  return { rows, inventory };
}

// The verifier is supplied by the trusted fixed-H gateway pipeline. A local
// projection or a caller-provided `complete: true` is never export evidence.
export function createRecoveryCodec({ verifyCompleteSnapshot } = {}) {
  if (typeof verifyCompleteSnapshot !== 'function') fail('complete_snapshot_verifier_required');
  async function createRecoveryPackage(captureSnapshot, { scope, exportId = crypto.randomUUID(), completeSnapshot, recheckLocalRevision } = {}) {
    scopeKey(scope); if (!UUID.test(exportId)) fail('invalid_export_id');
    const snapshot = clone(captureSnapshot); validateSnapshot(snapshot, scope);
    if (!object(completeSnapshot) || typeof recheckLocalRevision !== 'function') fail('complete_snapshot_evidence_required');
    const proof = await verifyCompleteSnapshot(completeSnapshot, { scope: clone(scope), head: snapshot.workspace.cursor, localRevision: snapshot.workspace.localRevision });
    if (!object(proof) || proof.verified !== true || scopeKey(proof.scope) !== scopeKey(scope) || proof.head !== snapshot.workspace.cursor
      || !same(proof.records, snapshot.workspace.shadow) || !same(proof.counts, counts(snapshot).accepted)) fail('incomplete_accepted_snapshot');
    accepted(proof.records, proof.head, snapshot.workspace.deviceId);
    const assets = await verifiedAssets(snapshot), exportedAt = new Date().toISOString(), packed = packAssets(assets, exportedAt);
    const photos = await createPhotoBackup(packed.rows);
    const workspace = JSON.stringify({ format: FORMAT, version: 1, exportId, scope, head: snapshot.workspace.cursor, localRevision: snapshot.workspace.localRevision,
      workspace: snapshot.workspace, jobs: snapshot.jobs, ledgers: snapshot.ledgers, inventory: packed.inventory });
    if (bytes(workspace).length > LIMITS.workspace || bytes(photos).length > LIMITS.photos) fail('recovery_size_limit');
    // Parse the actual generated photo1 bytes too; a valid package is required
    // before it can be presented as a download.
    parsePhotoBackup(photos);
    const files = { workspace: await descriptor(`tracker-${exportId}-workspace.json`, workspace), photos: await descriptor(`tracker-${exportId}-photos.json`, photos) };
    if (await recheckLocalRevision() !== snapshot.workspace.localRevision) fail('recovery_revision_changed');
    const manifest = JSON.stringify({ format: FORMAT, version: 1, scope, exportId, exportedAt, head: snapshot.workspace.cursor, localRevision: snapshot.workspace.localRevision,
      files, counts: counts(snapshot), inventory: packed.inventory, completeness: { acceptedAtHead: true, localSnapshot: true, assetBytesVerified: true } });
    if (bytes(manifest).length > LIMITS.manifest) fail('recovery_size_limit');
    return { manifest, workspace, photos };
  }
  async function parseRecoveryPackage(files, { scope } = {}) {
    scopeKey(scope);
    if (!object(files) || !same(Object.keys(files).sort(), ['manifest', 'photos', 'workspace'])) fail('invalid_recovery_files');
    const manifest = readFile(files.manifest, LIMITS.manifest, 'manifest');
    if (manifest.format !== FORMAT || manifest.version !== 1 || !UUID.test(manifest.exportId) || !sequence(manifest.head)
      || !Number.isSafeInteger(manifest.localRevision) || manifest.localRevision < 0 || typeof manifest.exportedAt !== 'string' || !Number.isFinite(Date.parse(manifest.exportedAt))
      || !same(manifest.completeness, { acceptedAtHead: true, localSnapshot: true, assetBytesVerified: true })) fail('invalid_recovery_manifest');
    if (scopeKey(manifest.scope) !== scopeKey(scope)) fail('recovery_scope_mismatch');
    for (const name of ['workspace', 'photos']) {
      const entry = manifest.files?.[name];
      if (!object(entry) || entry.name !== `tracker-${manifest.exportId}-${name}.json` || !HASH.test(entry.sha256)
        || typeof files[name] !== 'string' || bytes(files[name]).length > LIMITS[name] || bytes(files[name]).length !== entry.bytes || await recoverySHA256(files[name]) !== entry.sha256) fail('recovery_file_hash');
    }
    const raw = readFile(files.workspace, LIMITS.workspace, 'workspace');
    if (raw.format !== FORMAT || raw.version !== 1 || raw.exportId !== manifest.exportId || raw.head !== manifest.head || raw.localRevision !== manifest.localRevision
      || scopeKey(raw.scope) !== scopeKey(scope) || !same(raw.inventory, manifest.inventory) || !Array.isArray(raw.inventory)) fail('invalid_recovery_workspace');
    const decoded = parsePhotoBackup(files.photos), photos = new Map(decoded.photos.map(photo => [photo.id, photo])), used = new Set();
    const assets = raw.inventory.map(item => {
      if (!object(item) || !['blob', 'thumbnail'].includes(item.field)) fail('invalid_recovery_inventory');
      const photo = photos.get(item.photo1Id), slot = JSON.stringify([item.photo1Id, item.field]);
      if (!photo || used.has(slot)) fail('invalid_recovery_inventory'); used.add(slot);
      const metadata = { ...item }; delete metadata.photo1Id; delete metadata.field;
      return { ...metadata, blob: photo[item.field] };
    });
    for (const photo of decoded.photos) {
      if (!used.has(JSON.stringify([photo.id, 'blob']))) fail('incomplete_recovery_inventory');
      if (!used.has(JSON.stringify([photo.id, 'thumbnail'])) && await recoverySHA256(photo.blob) !== await recoverySHA256(photo.thumbnail)) fail('incomplete_recovery_inventory');
    }
    const snapshot = { workspace: raw.workspace, assets, jobs: raw.jobs, ledgers: raw.ledgers };
    validateSnapshot(snapshot, scope);
    if (snapshot.workspace.cursor !== manifest.head || snapshot.workspace.localRevision !== manifest.localRevision) fail('recovery_capture_mismatch');
    await verifiedAssets(snapshot);
    if (!same(manifest.counts, counts(snapshot))) fail('recovery_count_mismatch');
    return { manifest: clone(manifest), snapshot };
  }
  async function restoreRecoveryPackage(files, { scope, deviceId, recoveryId = crypto.randomUUID(), saveDetached } = {}) {
    if (!UUID.test(deviceId) || !UUID.test(recoveryId) || typeof saveDetached !== 'function') fail('invalid_detached_restore');
    const parsed = await parseRecoveryPackage(files, { scope });
    if (deviceId === parsed.snapshot.workspace.deviceId) fail('fresh_detached_device_required');
    return saveDetached(parsed.snapshot, { recoveryId, deviceId, originalDeviceId: parsed.snapshot.workspace.deviceId, networkResumeAllowed: false });
  }
  return Object.freeze({ createRecoveryPackage, parseRecoveryPackage, restoreRecoveryPackage });
}
