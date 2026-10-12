import { emptyData } from './data.js?v=41';
import { buildLocalIntent, canonical, validateAccountData } from './cloud-records.js?v=41';
import { validateWirePhoto, validatePhotoAsset, validatePhotoDescriptor, validatePhotoAssetPath } from './cloud-photo.js?v=41';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function scopeKey(scope) {
  if (!scope || !uuid(scope.uid) || !['test', 'preview', 'production'].includes(scope.environment) || typeof scope.projectId !== 'string' || !scope.projectId || scope.projectId.length > 512 || Object.keys(scope).some(key => !['uid', 'environment', 'projectId'].includes(key))) throw Error('invalid_scope');
  return JSON.stringify([scope.environment, scope.projectId, scope.uid]);
}
function workspace(scope, deviceId) {
  return { version: 1, scope: structuredClone(scope), deviceId, localRevision: 0, data: emptyData(), shadow: [], outbox: [], conflicts: [], syncReceipts: [], receipts: [], cursor: '0', initialized: false, bootstrap: null, selectedLiveId: null };
}
function validate(row, scope) {
  if (!row || row.version !== 1 || scopeKey(row.scope) !== scopeKey(scope) || !uuid(row.deviceId) || !Number.isSafeInteger(row.localRevision) || row.localRevision < 0 || !['shadow', 'outbox', 'conflicts', 'syncReceipts'].every(key => Array.isArray(row[key])) || typeof row.initialized !== 'boolean' || typeof row.cursor !== 'string' || !/^(0|[1-9][0-9]*)$/.test(row.cursor)) throw Error('invalid_workspace');
  validateAccountData(row.data);
}
const photoStores = ['photoAssets', 'photoJobs', 'importLedgers'];
function validateJSON(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || seen.has(value) || !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw Error('invalid_json_value');
  seen.add(value); for (const item of Object.values(value)) validateJSON(item, seen); seen.delete(value);
}
function retainedPhotoMetadata(value, result = []) {
  if (!value || typeof value !== 'object') return result;
  if (value.kind === 'photo' && value.payload) result.push(value.payload);
  else if (value.id && value.original && value.thumbnail && typeof value.date === 'string') result.push(value);
  for (const item of Object.values(value)) if (item && typeof item === 'object') retainedPhotoMetadata(item, result);
  return result;
}
function photosFromSnapshot(row, jobs) {
  const photos = new Map(row.shadow.filter(item => item.kind === 'photo' && !item.deleted).map(item => [item.recordId, item.payload]));
  for (const job of [...jobs].filter(job => job.state !== 'applied').sort((a, b) => a.localRevision - b.localRevision)) {
    for (const meta of job.before) photos.delete(meta.id);
    for (const meta of job.after) photos.set(meta.id, meta);
  }
  return [...photos.values()];
}
function checkedRevision(row, expected) {
  if (!Number.isSafeInteger(expected) || row.localRevision !== expected) throw Error('stale_revision');
}
function increment(row) { row.localRevision++; if (!Number.isSafeInteger(row.localRevision)) throw Error('revision_overflow'); }
function reviewed(actual, expected) {
  if (!Array.isArray(expected) || canonical([...actual].sort((a, b) => a.id.localeCompare(b.id))) !== canonical([...expected].sort((a, b) => a.id.localeCompare(b.id)))) throw Error('photo_review_changed');
}
function selection(photo, selector) {
  return selector.ownerType ? photo.ownerType === selector.ownerType && photo.ownerId === selector.ownerId : photo.category === 'daily' && photo.date === selector.date;
}
function validSelector(selector) {
  if (!selector || (selector.ownerType ? !['food', 'recipe'].includes(selector.ownerType) || typeof selector.ownerId !== 'string' || !selector.ownerId : selector.category !== 'daily' || !/^\d{4}-\d{2}-\d{2}$/.test(selector.date))) throw Error('invalid_photo_selector');
}
function ownerExists(meta, row) {
  if (meta.ownerType && !(meta.ownerType === 'food' ? row.data.foods : row.data.recipes).some(owner => owner.id === meta.ownerId)) throw Error('photo_owner_missing');
}
function sequence(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value) || value.length > 19 || BigInt(value) > 9223372036854775807n) throw Error('invalid_photo_acknowledgement');
  return BigInt(value);
}
const withoutPaths = metadata => ({ ...metadata, original: (({ path, ...descriptor }) => descriptor)(metadata.original), thumbnail: (({ path, ...descriptor }) => descriptor)(metadata.thumbnail) });
function checkedPhotoPaths(metadata, scope, manifestId) {
  for (const kind of ['original', 'thumbnail']) if (metadata[kind].path !== undefined) {
    const parts = metadata[kind].path.split('/'); validatePhotoAssetPath(metadata[kind].path, scope, manifestId ?? parts[3], kind);
  }
}
async function validatePrepared(change) {
  if (!change || !['put', 'update', 'delete', 'replace', 'delete-daily'].includes(change.operation)) throw Error('invalid_photo_operation');
  if (!Array.isArray(change.expectedPhotos)) throw Error('photo_review_required');
  for (const meta of change.expectedPhotos) validateWirePhoto(meta);
  if (!['delete', 'delete-daily'].includes(change.operation)) validateWirePhoto(change.metadata);
  if (change.operation === 'replace') validSelector(change.selector);
  if (change.operation === 'delete' && (typeof change.id !== 'string' || !change.id || change.id.length > 100)) throw Error('invalid_photo_id');
  const assets = change.assets ?? [];
  if (!Array.isArray(assets) || new Set(assets.map(asset => asset.assetId)).size !== assets.length) throw Error('invalid_photo_assets');
  await Promise.all(assets.map(validatePhotoAsset));
  if (['put', 'replace'].includes(change.operation) && assets.length !== 2) throw Error('missing_photo_assets');
  if (!['delete', 'delete-daily'].includes(change.operation)) for (const descriptor of [change.metadata.original, change.metadata.thumbnail]) {
    const asset = assets.find(item => item.assetId === descriptor.assetId);
    if (asset) { const { blob, ...value } = asset; if (canonical(value) !== canonical(descriptor)) throw Error('photo_asset_descriptor_mismatch'); }
    else if (['put', 'replace'].includes(change.operation)) throw Error('missing_photo_assets');
  }
  if (['update', 'delete', 'delete-daily'].includes(change.operation) && assets.length) throw Error('immutable_photo_assets');
}
const identity=r=>JSON.stringify([r.kind,r.recordId]);
const strip=({path,...descriptor})=>descriptor;
export function photoRelevant(job,record){
  if(job.operation==='delete-daily'){if(record.kind==='journal')return record.recordId===job.journalBefore.id;if(record.kind==='photo')return record.payload.category==='daily'&&record.payload.date===job.journalBefore.date;return false;}
  if(record.kind==='photo')return [...job.before,...job.after].some(meta=>meta.id===record.recordId || meta.category==='daily'&&record.payload.category==='daily'&&meta.date===record.payload.date || meta.ownerType&&record.payload.ownerType===meta.ownerType&&record.payload.ownerId===meta.ownerId);
  return [...job.after].some(meta=>meta.ownerType===record.kind&&meta.ownerId===record.recordId);
}
export function buildPhotoRequest(snapshot,job){
  if(!Array.isArray(job.initialBase))throw Error('photo_base_missing');
  const equal=(a,b)=>canonical(a)===canonical(b);
  const expected=new Map(job.initialBase.filter(r=>photoRelevant(job,r)).map(r=>[identity(r),r]));
  for(const id of job.dependsOn){const predecessor=snapshot.jobs.find(j=>j.id===id);if(!predecessor || predecessor.state!=='applied')throw Error('photo_dependency_pending');if(predecessor.deviceId!==job.deviceId || scopeKey(predecessor.scope)!==scopeKey(job.scope) || predecessor.receipt?.operationId!==id)throw Error('revision_conflict');for(const r of predecessor.receipt.records){expected.delete(identity(r));if(photoRelevant(job,r))expected.set(identity(r),r);}}
  for (const dependency of job.jsonDependsOn ?? []) {
    const receipt = snapshot.workspace.receipts?.find(item => item.operationId === dependency.id);
    if (!receipt) throw Error('photo_dependency_pending');
    const accepted = receipt.records?.find(record => record.kind === dependency.kind && record.recordId === dependency.recordId);
    const sent = receipt.request?.changes?.find(change => change.kind === dependency.kind && change.recordId === dependency.recordId);
    if (receipt.request?.deviceId !== dependency.deviceId || dependency.deviceId !== job.deviceId || !accepted || accepted.deleted || !dependency.candidate || !sent || !equal(sent.payload, dependency.candidate.payload) || !equal(accepted.payload, dependency.candidate.payload)) throw Error('revision_conflict');
    expected.set(identity(accepted), accepted);
  }
  const current=snapshot.workspace.shadow.filter(r=>photoRelevant(job,r));
  const sort=values=>[...values].sort((a,b)=>identity(a).localeCompare(identity(b)));
  if(!equal(sort(current),sort(expected.values())))throw Error('revision_conflict');
  if(job.operation==='delete-daily'){const journal=current.find(r=>r.kind==='journal'&&r.recordId===job.journalBefore.id&&!r.deleted);if(!journal||!equal(journal.payload,job.journalBefore))throw Error('revision_conflict');return {protocolVersion:2,operationId:job.id,deviceId:job.deviceId,action:'delete-daily',recordId:journal.recordId,baseRevision:journal.revision,journalDate:job.journalBefore.date,ownerBaseRevision:null,dailyPhotoSet:current.filter(r=>r.kind==='photo'&&!r.deleted).map(r=>({recordId:r.recordId,revision:r.revision})).sort((a,b)=>a.recordId.localeCompare(b.recordId))};}
  const meta=job.after[0]??job.before[0], base=current.find(r=>r.kind==='photo'&&r.recordId===meta.id);
  const owner=meta.ownerType?current.find(r=>r.kind===meta.ownerType&&r.recordId===meta.ownerId&&!r.deleted):null;
  if(job.after.length&&meta.ownerType&&!owner)throw Error('photo_owner_missing');
  const action={put:'create',update:'edit',replace:'replace',delete:'delete'}[job.operation];
  const request={protocolVersion:2,operationId:job.id,deviceId:job.deviceId,action,recordId:meta.id,baseRevision:base?.revision??null,ownerBaseRevision:job.after.length?owner?.revision??null:null,dailyPhotoSet:[...job.before,...job.after].some(photo=>photo.category==='daily')?current.filter(r=>r.kind==='photo'&&!r.deleted&&r.payload.category==='daily'&&[...job.before,...job.after].some(photo=>photo.date===r.payload.date)).map(r=>({recordId:r.recordId,revision:r.revision})).sort((a,b)=>a.recordId.localeCompare(b.recordId)):[]};
  if(job.after.length){const {original,thumbnail,...metadata}=job.after[0];request.metadata=metadata;if(['put','replace'].includes(job.operation)){request.original=strip(original);request.thumbnail=strip(thumbnail);}}
  if(job.operation==='replace')request.replacedPhotos=job.before.filter(meta=>meta.id!==request.recordId).map(meta=>{const r=current.find(r=>r.kind==='photo'&&r.recordId===meta.id&&!r.deleted);if(!r)throw Error('revision_conflict');return {recordId:meta.id,revision:r.revision};});
  return request;
}
export function createAccountStore({ indexedDB = globalThis.indexedDB, dbName = 'tracker-sync', isCurrent = () => true, deviceId } = {}) {
  if (!indexedDB?.open || deviceId !== undefined && !uuid(deviceId)) throw Error('storage_unavailable');
  let db = null, opening = null, sealed = false;
  const active = new Set();
  const guard = () => { if (sealed || !isCurrent()) throw Error('sealed_or_stale_workspace'); };
  async function connection() {
    guard(); if (db) return db;
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 2); let blocked = false;
      request.onupgradeneeded = () => {
        if (blocked || sealed || !isCurrent()) { request.transaction.abort(); return; }
        for (const name of ['workspaces', 'metadata', ...photoStores, 'recoveryWorkspaces']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      };
      request.onerror = () => reject(Error('storage_open_failed'));
      request.onblocked = () => { blocked = true; reject(Error('storage_open_blocked')); };
      request.onsuccess = () => {
        if (blocked || sealed || !isCurrent()) { request.result.close(); reject(Error('sealed_or_stale_workspace')); return; }
        db = request.result; db.onversionchange = () => api.seal(); resolve(db);
      };
    });
    return opening;
  }
  async function run(scope, write, work, extraStores = []) {
    const key = scopeKey(scope), database = await connection(); guard();
    return new Promise((resolve, reject) => {
      let result, failure;
      const transaction = database.transaction(['workspaces', 'metadata', ...extraStores], write ? 'readwrite' : 'readonly'); active.add(transaction);
      const rows = transaction.objectStore('workspaces');
      const abort = error => { failure ??= error; try { transaction.abort(); } catch {} };
      transaction.onerror = () => { failure ??= Error('storage_transaction_failed'); };
      transaction.onabort = () => { active.delete(transaction); reject(failure ?? Error('storage_transaction_aborted')); };
      transaction.oncomplete = () => { active.delete(transaction); try { guard(); resolve(structuredClone(result)); } catch (error) { reject(error); } };
      const request = rows.get(key);
      request.onsuccess = () => {
        const stores = Object.fromEntries(extraStores.map(name => [name, transaction.objectStore(name)])), values = {};
        const invoke = () => { try { guard(); work({ row: request.result, rows, metadata: transaction.objectStore('metadata'), key, stores, values, finish(value) { result = value; }, guard, abort }); } catch (error) { abort(error); } };
        try {
          guard(); let remaining = extraStores.length;
          if (!remaining) { invoke(); return; }
          for (const name of extraStores) {
            // ponytail: cursor scans scoped keys; add scope indexes if library size warrants them.
            const query = stores[name].openCursor(); values[name] = [];
            query.onsuccess = () => {
              try {
                guard(); const cursor = query.result;
                if (!cursor) { if (--remaining === 0) invoke(); return; }
                if (Array.isArray(cursor.key) && cursor.key[0] === key) values[name].push(cursor.value);
                cursor.continue();
              } catch (error) { abort(error); }
            };
          }
        }
        catch (error) { abort(error); }
      };
      // All callbacks remain synchronous inside this single IndexedDB transaction.
      transaction.addEventListener('error', event => { event.preventDefault(); abort(Error('storage_transaction_failed')); });
    });
  }
  const api = {
    async listScopes() {
      const database = await connection(); guard();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction('workspaces', 'readonly'); active.add(transaction);
        const request = transaction.objectStore('workspaces').getAll(); let scopes;
        request.onsuccess = () => {
          try { guard(); scopes = request.result.map(row => { validate(row, row.scope); return structuredClone(row.scope); }); }
          catch { try { transaction.abort(); } catch {} }
        };
        transaction.oncomplete = () => { active.delete(transaction); try { guard(); resolve(scopes); } catch (error) { reject(error); } };
        transaction.onerror = () => {};
        transaction.onabort = () => { active.delete(transaction); reject(Error('storage_transaction_aborted')); };
      });
    },
    open: scope => run(scope, true, context => {
      const { row, rows, metadata, key, finish } = context;
      if (row) { validate(row, scope); finish(row); return; }
      const request = metadata.get('installation');
      request.onsuccess = () => {
        try {
          guard(); const installation = request.result ?? { deviceId: deviceId ?? crypto.randomUUID() };
          if (!uuid(installation.deviceId)) throw Error('invalid_installation');
          if (!request.result) metadata.put(installation, 'installation');
          const created = workspace(scope, installation.deviceId); rows.put(created, key); finish(created);
        } catch (error) { context.abort(error); }
      };
    }),
    read: scope => run(scope, false, ({ row, finish }) => { if (!row) throw Error('workspace_not_open'); validate(row, scope); finish(row); }),
    transact: (scope, expectedRevision, change) => run(scope, true, ({ row, rows, key, values, finish }) => {
      if (!row) throw Error('workspace_not_open'); validate(row, scope);
      if (expectedRevision !== null && expectedRevision !== undefined && row.localRevision !== expectedRevision) throw Error('stale_revision');
      const next = structuredClone(row), returned = change(next);
      if (returned?.then) throw Error('transaction_mutation_must_be_synchronous');
      for(const job of values.photoJobs)if(job.operation==='delete-daily'&&job.state!=='applied'){if(next.outbox.some(intent=>!row.outbox.some(old=>old.id===intent.id)&&intent.changes.some(c=>c.kind==='journal'&&c.recordId===job.journalBefore.id&&c.after)))throw Error('journal_delete_pending');next.data.journalEntries=next.data.journalEntries.filter(j=>j.id!==job.journalBefore.id);}
      guard(); validate(next, scope);
      if (next.deviceId !== row.deviceId || next.localRevision !== row.localRevision) throw Error('immutable_workspace_identity');
      if (canonical(next) === canonical(row)) { finish(row); return; }
      next.localRevision++; if (!Number.isSafeInteger(next.localRevision)) throw Error('revision_overflow');
      guard(); rows.put(next, key); finish(next);
    }, ['photoJobs']),
    commit: (scope, change, expectedData) => api.transact(scope, null, row => {
      if (expectedData !== undefined && canonical(row.data) !== canonical(expectedData)) throw Error('stale_data');
      const next = structuredClone(row.data), returned = change(next);
      if (returned?.then) throw Error('transaction_mutation_must_be_synchronous');
      validateAccountData(next); const intent = buildLocalIntent(row, next);
      if (!intent) return;
      row.data = next; row.outbox.push(intent);
      row.selectedLiveId = next.draft ? next.draft.historyEditBase != null ? `${row.deviceId}:${next.draft.id}` : next.draft.id : null;
    }),
    captureSnapshot: scope => run(scope, false, ({ row, values, finish }) => {
      if (!row) throw Error('workspace_not_open'); validate(row, scope);
      finish({ workspace: row, assets: values.photoAssets, jobs: values.photoJobs.sort((a, b) => a.localRevision - b.localRevision), ledgers: values.importLedgers });
    }, photoStores),
    async photoSnapshot(scope) { const snapshot = await api.captureSnapshot(scope); return structuredClone(photosFromSnapshot(snapshot.workspace, snapshot.jobs)); },
    async readPhotoAsset(scope, assetId) { if (!uuid(assetId)) throw Error('invalid_photo_asset'); return (await api.captureSnapshot(scope)).assets.find(asset => asset.assetId === assetId) ?? null; },
    async getPhoto(scope, id) {
      const snapshot = await api.captureSnapshot(scope), meta = photosFromSnapshot(snapshot.workspace, snapshot.jobs).find(photo => photo.id === id);
      if (!meta) return null;
      const original = snapshot.assets.find(asset => asset.assetId === meta.original.assetId), thumbnail = snapshot.assets.find(asset => asset.assetId === meta.thumbnail.assetId);
      if (!original || !thumbnail) throw Error('photo_bytes_missing');
      await Promise.all([validatePhotoAsset(original), validatePhotoAsset(thumbnail)]); guard();
      return { ...meta, blob: original.blob, thumbnail: thumbnail.blob };
    },
    async listPhotos(scope) { const photos = await api.photoSnapshot(scope); return Promise.all(photos.map(photo => api.getPhoto(scope, photo.id))); },
    async commitPhoto(scope, preparedChange, expectedRevision) {
      guard(); scopeKey(scope); const change = structuredClone(preparedChange);
      await validatePrepared(change); guard();
      return run(scope, true, ({ row, rows, key, stores, values, finish }) => {
        if (!row) throw Error('workspace_not_open'); validate(row, scope); checkedRevision(row, expectedRevision);
        const current = photosFromSnapshot(row, values.photoJobs), id = change.metadata?.id ?? change.id, existing = current.find(meta => meta.id === id);
        let before;
        if(change.operation==='delete-daily'){const journal=row.data.journalEntries.find(j=>j.id===change.journalBefore?.id);if(!journal||canonical(journal)!==canonical(change.journalBefore))throw Error('journal_review_changed');before=current.filter(meta=>meta.category==='daily'&&meta.date===journal.date);reviewed(before,change.expectedPhotos);}
        else if (change.operation === 'put') { if (existing) throw Error('photo_id_collision'); before = []; reviewed(before, change.expectedPhotos); }
        else if (change.operation === 'replace') {
          before = current.filter(meta => selection(meta, change.selector)); reviewed(before, change.expectedPhotos);
          if (!selection(change.metadata, change.selector)) throw Error('photo_selector_mismatch');
          if (existing && !before.some(meta => meta.id === existing.id)) throw Error('photo_id_collision');
        } else {
          if (!existing) throw Error('photo_missing'); before = [existing]; reviewed(before, change.expectedPhotos);
          if (change.operation === 'update' && (canonical(existing.original) !== canonical(change.metadata.original) || canonical(existing.thumbnail) !== canonical(change.metadata.thumbnail) || existing.createdAt !== change.metadata.createdAt)) throw Error('immutable_photo_assets');
        }
        const after = ['delete','delete-daily'].includes(change.operation) ? [] : [change.metadata]; for (const meta of after) { ownerExists(meta, row); checkedPhotoPaths(meta, scope); }
        for (const asset of change.assets ?? []) {
          if (values.photoAssets.some(previous => previous.assetId === asset.assetId)) throw Error('photo_asset_collision');
          guard(); stores.photoAssets.put(asset, [key, asset.assetId]);
        }
        for (const meta of after) for (const descriptor of [meta.original, meta.thumbnail]) if (![...values.photoAssets, ...(change.assets ?? [])].some(asset => asset.assetId === descriptor.assetId && asset.sha256 === descriptor.sha256 && asset.bytes === descriptor.bytes)) throw Error('photo_bytes_missing');
        const next = structuredClone(row); if(change.operation==='delete-daily')next.data.journalEntries=next.data.journalEntries.filter(j=>j.id!==change.journalBefore.id);increment(next);
        const touched = new Set([...before, ...after].map(meta => meta.id));
        const dependsOn = values.photoJobs.filter(job => job.state !== 'applied' && [...job.before, ...job.after].some(meta => photoRelevant({ before, after,operation:change.operation,journalBefore:change.journalBefore }, { kind: 'photo', recordId: meta.id, payload: meta }))).sort((a, b) => a.localRevision - b.localRevision).map(job => job.id);
        const jsonDependsOn = row.outbox.flatMap(intent => intent.changes.filter(c => after.some(meta => meta.ownerType === c.kind && meta.ownerId === c.recordId)||change.operation==='delete-daily'&&c.kind==='journal'&&c.recordId===change.journalBefore.id).map(c => ({ id: intent.id, deviceId: intent.deviceId, kind: c.kind, recordId: c.recordId, candidate: structuredClone(c.after) })));
        const job = { ...(change.operation==='delete-daily'?{journalBefore:change.journalBefore}:{}),jsonDependsOn, id: crypto.randomUUID(), scope: structuredClone(scope), deviceId: row.deviceId, localRevision: next.localRevision, operation: change.operation, before, after, selector: change.selector ?? null, initialBase: structuredClone(row.shadow), dependsOn, request: null, state: 'queued' };
        guard(); stores.photoJobs.put(job, [key, job.id]); rows.put(next, key); finish(next);
      }, ['photoAssets', 'photoJobs']);
    },
    async cachePhotoAsset(scope, descriptor, blob) {
      guard(); scopeKey(scope); const asset = structuredClone({ ...descriptor, blob }); await validatePhotoAsset(asset); guard();
      if (descriptor.path !== undefined) { const parts = descriptor.path.split('/'); validatePhotoAssetPath(descriptor.path, scope, parts[3], parts[4]?.slice(0, -4)); }
      return run(scope, true, ({ row, rows, key, stores, values, finish }) => {
        if (!row) throw Error('workspace_not_open'); validate(row, scope);
        const previous = values.photoAssets.find(item => item.assetId === asset.assetId);
        if (previous && (previous.sha256 !== asset.sha256 || previous.bytes !== asset.bytes || previous.mime !== asset.mime || previous.path && asset.path && previous.path !== asset.path)) throw Error('photo_asset_collision');
        if (previous && (!asset.path || asset.path === previous.path)) { finish(row); return; }
        const next = structuredClone(row); increment(next); guard(); stores.photoAssets.put(asset, [key, asset.assetId]); rows.put(next, key); finish(next);
      }, ['photoAssets']);
    },
    updatePhotoJob: (scope, jobId, patch, expectedRevision) => run(scope, true, ({ row, rows, key, stores, values, finish }) => {
      if (!row) throw Error('workspace_not_open'); validate(row, scope); checkedRevision(row, expectedRevision);
      const job = values.photoJobs.find(item => item.id === jobId);
      if (!job || job.state === 'applied' || !patch || Object.keys(patch).some(key => !['request', 'manifest', 'manifestId', 'state', 'error', 'conflict'].includes(key))) throw Error('invalid_photo_job_update');
      validateJSON(patch);
      const nextJob = structuredClone(job);
      if (patch.request !== undefined) {
        if (!patch.request || patch.request.protocolVersion !== 2 || patch.request.operationId !== job.id || patch.request.deviceId !== job.deviceId || !['create', 'edit', 'replace', 'delete', 'delete-daily'].includes(patch.request.action) || patch.request.recordId !== (job.journalBefore?.id ?? job.after[0]?.id ?? job.before[0]?.id) || job.request && canonical(job.request) !== canonical(patch.request)) throw Error('immutable_photo_request');
        if (!job.request && canonical(patch.request) !== canonical(buildPhotoRequest({ workspace: row, jobs: values.photoJobs }, job))) throw Error('immutable_photo_request');
        nextJob.request = structuredClone(patch.request);
        if (!job.request) nextJob.requestBase = row.shadow.filter(record => photoRelevant(job,record));
      }
      if (patch.manifest !== undefined) {
        const manifest = patch.manifest;
        if (!uuid(manifest?.manifestId) || manifest.operationId !== job.id || manifest.deviceId !== job.deviceId || job.manifest && canonical(job.manifest) !== canonical(manifest)) throw Error('immutable_photo_manifest');
        for (const kind of ['original', 'thumbnail']) if (manifest[kind]) validatePhotoAssetPath(manifest[kind].path, scope, manifest.manifestId, kind);
        nextJob.manifest = structuredClone(manifest);
      }
      if (patch.manifestId !== undefined) {
        if (!uuid(patch.manifestId) || job.manifestId && job.manifestId !== patch.manifestId || nextJob.manifest && nextJob.manifest.manifestId !== patch.manifestId) throw Error('immutable_photo_manifest');
        nextJob.manifestId = patch.manifestId;
      }
      if (patch.state !== undefined) { if (!['queued', 'sending', 'staged', 'conflict', 'failed'].includes(patch.state)) throw Error('invalid_photo_job_state'); nextJob.state = patch.state; }
      if (patch.error !== undefined) { if (patch.error !== null && typeof patch.error !== 'string') throw Error('invalid_photo_job_error'); nextJob.error = patch.error; }
      if (patch.conflict !== undefined) {
        if (!patch.conflict || !['base', 'local', 'remote'].every(key => Array.isArray(patch.conflict[key])) || Object.keys(patch.conflict).some(key => !['base', 'local', 'remote'].includes(key)) || JSON.stringify(patch.conflict).length > 10_000_000 || job.conflict && canonical(job.conflict) !== canonical(patch.conflict)) throw Error('immutable_photo_conflict');
        nextJob.conflict = structuredClone(patch.conflict);
      }
      const next = structuredClone(row); increment(next); guard(); stores.photoJobs.put(nextJob, [key, jobId]); rows.put(next, key); finish(next);
    }, ['photoJobs']),
    ackPhotoJob: (scope, jobId, result, expectedRevision) => run(scope, true, ({ row, rows, key, stores, values, finish }) => {
      if (!row) throw Error('workspace_not_open'); validate(row, scope); if (expectedRevision !== undefined) checkedRevision(row, expectedRevision);
      validateJSON(result);
      const job = values.photoJobs.find(item => item.id === jobId);
      if (!job || !job.request || result?.status !== 'applied' || result.operationId !== jobId || !Array.isArray(result.records) || sequence(result.commitSequence) < 1n) throw Error('invalid_photo_acknowledgement');
      if (job.state === 'applied') { if (canonical(job.receipt) !== canonical(result)) throw Error('invalid_photo_acknowledgement'); finish(row); return; }
      const expected = new Map(job.before.map(meta => [JSON.stringify(['photo',meta.id]), { metadata: meta, deleted: true }]));
      if(job.operation==='delete-daily')expected.set(JSON.stringify(['journal',job.journalBefore.id]),{metadata:job.journalBefore,deleted:true,journal:true});
      for (const meta of job.after) expected.set(JSON.stringify(['photo',meta.id]), { metadata: meta, deleted: false });
      if (result.records.length !== expected.size || new Set(result.records.map(identity)).size !== expected.size) throw Error('invalid_photo_acknowledgement');
      const next = structuredClone(row);
      for (const record of result.records) {
        const want = expected.get(identity(record)), base = job.requestBase?.find(item => identity(item) === identity(record));
        if (!want || record.kind !== (want.journal?'journal':'photo') || record.payloadSchema !== 8 || record.deleted !== want.deleted || record.phase !== null || record.deviceId !== null || record.sourceSessionId !== null || record.commitSequence !== result.commitSequence || sequence(record.revision) !== (base ? sequence(base.revision) + 1n : 1n) || sequence(record.position) < 0n || base && (record.position !== base.position || sequence(record.commitSequence) <= sequence(base.commitSequence))) throw Error('invalid_photo_acknowledgement');
        if(want.journal){if(!base||canonical(record.payload)!==canonical(base.payload))throw Error('invalid_photo_acknowledgement');const prior=next.shadow.find(r=>r.kind==='journal'&&r.recordId===record.recordId);if(prior&&sequence(prior.revision)===sequence(record.revision)&&canonical(prior)!==canonical(record))throw Error('invalid_photo_acknowledgement');if(!prior||sequence(prior.revision)<sequence(record.revision)){next.shadow=next.shadow.filter(r=>r.kind!=='journal'||r.recordId!==record.recordId);next.shadow.push(structuredClone(record));}continue;}
        try { validateWirePhoto(record.payload); checkedPhotoPaths(record.payload, scope, ['put', 'replace'].includes(job.operation) && !want.deleted ? job.manifestId ?? job.manifest?.manifestId : undefined); } catch { throw Error('invalid_photo_acknowledgement'); }
        const expectedPayload = want.deleted && base ? base.payload : want.metadata;
        if (canonical(withoutPaths(record.payload)) !== canonical(withoutPaths(expectedPayload))) throw Error('invalid_photo_acknowledgement');
        const prior = next.shadow.find(item => item.kind === 'photo' && item.recordId === record.recordId);
        if (prior && sequence(prior.revision) === sequence(record.revision) && canonical(prior) !== canonical(record)) throw Error('invalid_photo_acknowledgement');
        if (!prior || sequence(prior.revision) < sequence(record.revision)) { next.shadow = next.shadow.filter(item => item.kind !== 'photo' || item.recordId !== record.recordId); next.shadow.push(structuredClone(record)); }
      }
      next.receipts ??= []; next.receipts.push({ operationId: jobId, request: structuredClone(job.request), records: structuredClone(result.records), commitSequence: result.commitSequence }); increment(next);
      guard(); stores.photoJobs.put({ ...job, state: 'applied', receipt: structuredClone(result) }, [key, jobId]); rows.put(next, key); finish(next);
    }, ['photoJobs']),
    async writeImportLedger(scope, ledger, expectedRevision) {
      guard(); const value = structuredClone(ledger);
      validateJSON(value);
      if (!uuid(value?.id) || scopeKey(value.scope) !== scopeKey(scope) || !uuid(value.deviceId) || !value.sourceHashes || Object.values(value.sourceHashes).some(hash => typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash))) throw Error('invalid_import_ledger');
      return run(scope, true, ({ row, rows, key, stores, values, finish }) => {
        if (!row) throw Error('workspace_not_open'); validate(row, scope); checkedRevision(row, expectedRevision);
        const existing = values.importLedgers.find(item => item.id === value.id);
        if (value.deviceId !== row.deviceId || existing && (existing.deviceId !== value.deviceId || canonical(existing.sourceHashes) !== canonical(value.sourceHashes))) throw Error('immutable_import_identity');
        const next = structuredClone(row); increment(next); guard(); stores.importLedgers.put(value, [key, value.id]); rows.put(next, key); finish(next);
      }, ['importLedgers']);
    },
    async queueImportLedger(scope, ledger, expectedRevision) {
      const value = structuredClone(ledger); validateJSON(value);
      return run(scope, true, ({ row, rows, key, stores, values, finish }) => {
        validate(row, scope); checkedRevision(row, expectedRevision);
        const existing = values.importLedgers.find(item => item.id === value.id);
        if (!existing || value.state === 'review' || value.deviceId !== row.deviceId || scopeKey(value.scope) !== scopeKey(scope)
          || canonical(existing.source) !== canonical(value.source) || canonical(existing.batches) !== canonical(value.batches)
          || canonical(existing.mapping) !== canonical(value.mapping)) throw Error('immutable_import_identity');
        const next = structuredClone(row);
        for (const batch of value.batches) {
          if (value.acceptedReceipts.some(r => r.operationId === batch.operationId)) continue;
          if (batch.assetDependencies.length) throw Error('import_photo_keep_local_required');
          const prior = next.outbox.find(intent => intent.id === batch.operationId);
          if (prior) { if (canonical(prior.request) !== canonical(batch.request)) throw Error('immutable_import_request'); continue; }
          const change = batch.request.changes[0];
          if (next.shadow.some(r => identity(r) === identity(change)) || next.outbox.some(intent => intent.changes.some(c => identity(c) === identity(change)))) throw Error('import_target_collision');
          next.outbox.push({id:batch.operationId,deviceId:row.deviceId,commandType:'import-records',state:'queued',dependsOn:[],request:structuredClone(batch.request),requestBase:[null],changes:[{...structuredClone(change),before:null,base:null,after:{...structuredClone(change),position:String(batch.request.changes[0].sourceIndex??value.batches.indexOf(batch))}}]});
        }
        increment(next); guard(); stores.importLedgers.put(value,[key,value.id]); rows.put(next,key); finish(next);
      }, ['importLedgers']);
    },
    async readImportLedger(scope, id) { if (!uuid(id)) throw Error('invalid_import_id'); return (await api.captureSnapshot(scope)).ledgers.find(item => item.id === id) ?? null; },
    async saveDetachedRecovery(validatedSnapshot, newID) {
      guard(); if (!uuid(newID)) throw Error('invalid_recovery_id');
      const snapshot = structuredClone(validatedSnapshot), scope = snapshot?.workspace?.scope;
      validate(snapshot.workspace, scope);
      validateJSON(snapshot.workspace); validateJSON(snapshot.jobs); validateJSON(snapshot.ledgers);
      if (!['assets', 'jobs', 'ledgers'].every(key => Array.isArray(snapshot[key])) || new Set(snapshot.assets.map(asset => asset.assetId)).size !== snapshot.assets.length) throw Error('invalid_recovery_snapshot');
      await Promise.all(snapshot.assets.map(validatePhotoAsset)); guard();
      for (const job of snapshot.jobs) {
        if (!uuid(job.id) || !uuid(job.deviceId) || scopeKey(job.scope) !== scopeKey(scope) || !Number.isSafeInteger(job.localRevision) || job.localRevision < 1 || job.localRevision > snapshot.workspace.localRevision || !Array.isArray(job.before) || !Array.isArray(job.after) || !Array.isArray(job.dependsOn)) throw Error('invalid_recovery_job');
        for (const meta of [...job.before, ...job.after]) validateWirePhoto(meta);
      }
      for (const meta of retainedPhotoMetadata([snapshot.workspace, snapshot.jobs, snapshot.ledgers])) {
        validateWirePhoto(meta); checkedPhotoPaths(meta, scope);
        for (const descriptor of [meta.original, meta.thumbnail]) if (!snapshot.assets.some(asset => asset.assetId === descriptor.assetId && asset.sha256 === descriptor.sha256 && asset.bytes === descriptor.bytes)) throw Error('photo_bytes_missing');
      }
      for (const ledger of snapshot.ledgers) if (!uuid(ledger.id) || scopeKey(ledger.scope) !== scopeKey(scope)) throw Error('invalid_recovery_ledger');
      return run(scope, true, ({ key, stores, values, finish }) => {
        if (values.recoveryWorkspaces.some(item => item.id === newID)) throw Error('recovery_id_collision');
        const recovery = { version: 1, id: newID, scope: structuredClone(scope), deviceId: crypto.randomUUID(), detached: true, networkEnabled: false, snapshot };
        guard(); stores.recoveryWorkspaces.add(recovery, [key, newID]); finish(recovery);
      }, ['recoveryWorkspaces']);
    },
    readDetachedRecovery: (scope, id) => run(scope, false, ({ values, finish }) => { if (!uuid(id)) throw Error('invalid_recovery_id'); finish(values.recoveryWorkspaces.find(item => item.id === id) ?? null); }, ['recoveryWorkspaces']),
    listDetachedRecoveries: scope => run(scope,false,({values,finish})=>finish(values.recoveryWorkspaces.map(({snapshot,...metadata})=>({...metadata,head:snapshot.workspace.cursor}))),['recoveryWorkspaces']),
    seal() { sealed = true; for (const transaction of active) { try { transaction.abort(); } catch {} } active.clear(); db?.close(); db = null; }
  };
  return api;
}
