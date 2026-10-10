import { emptyData } from './data.js?v=41';
import { buildLocalIntent, canonical, validateAccountData } from './cloud-records.js?v=41';

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
export function createAccountStore({ indexedDB = globalThis.indexedDB, dbName = 'tracker-sync', isCurrent = () => true, deviceId } = {}) {
  if (!indexedDB?.open || deviceId !== undefined && !uuid(deviceId)) throw Error('storage_unavailable');
  let db = null, opening = null, sealed = false;
  const active = new Set();
  const guard = () => { if (sealed || !isCurrent()) throw Error('sealed_or_stale_workspace'); };
  async function connection() {
    guard(); if (db) return db;
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('workspaces'); request.result.createObjectStore('metadata'); };
      request.onerror = () => reject(Error('storage_open_failed'));
      request.onblocked = () => reject(Error('storage_open_blocked'));
      request.onsuccess = () => {
        if (sealed || !isCurrent()) { request.result.close(); reject(Error('sealed_or_stale_workspace')); return; }
        db = request.result; db.onversionchange = () => api.seal(); resolve(db);
      };
    });
    return opening;
  }
  async function run(scope, write, work) {
    const key = scopeKey(scope), database = await connection(); guard();
    return new Promise((resolve, reject) => {
      let result, failure;
      const transaction = database.transaction(['workspaces', 'metadata'], write ? 'readwrite' : 'readonly'); active.add(transaction);
      const rows = transaction.objectStore('workspaces');
      const abort = error => { failure = error; try { transaction.abort(); } catch {} };
      transaction.onerror = () => { failure ??= Error('storage_transaction_failed'); };
      transaction.onabort = () => { active.delete(transaction); reject(failure ?? Error('storage_transaction_aborted')); };
      transaction.oncomplete = () => { active.delete(transaction); try { guard(); resolve(structuredClone(result)); } catch (error) { reject(error); } };
      const request = rows.get(key);
      request.onsuccess = () => {
        try { guard(); work({ row: request.result, rows, metadata: transaction.objectStore('metadata'), key, finish(value) { result = value; }, guard, abort }); }
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
    transact: (scope, expectedRevision, change) => run(scope, true, ({ row, rows, key, finish }) => {
      if (!row) throw Error('workspace_not_open'); validate(row, scope);
      if (expectedRevision !== null && expectedRevision !== undefined && row.localRevision !== expectedRevision) throw Error('stale_revision');
      const next = structuredClone(row), returned = change(next);
      if (returned?.then) throw Error('transaction_mutation_must_be_synchronous');
      guard(); validate(next, scope);
      if (next.deviceId !== row.deviceId || next.localRevision !== row.localRevision) throw Error('immutable_workspace_identity');
      if (canonical(next) === canonical(row)) { finish(row); return; }
      next.localRevision++; if (!Number.isSafeInteger(next.localRevision)) throw Error('revision_overflow');
      guard(); rows.put(next, key); finish(next);
    }),
    commit: (scope, change, expectedData) => api.transact(scope, null, row => {
      if (expectedData !== undefined && canonical(row.data) !== canonical(expectedData)) throw Error('stale_data');
      const next = structuredClone(row.data), returned = change(next);
      if (returned?.then) throw Error('transaction_mutation_must_be_synchronous');
      validateAccountData(next); const intent = buildLocalIntent(row, next);
      if (!intent) return;
      row.data = next; row.outbox.push(intent);
      row.selectedLiveId = next.draft ? next.draft.historyEditBase != null ? `${row.deviceId}:${next.draft.id}` : next.draft.id : null;
    }),
    seal() { sealed = true; for (const transaction of active) { try { transaction.abort(); } catch {} } active.clear(); db?.close(); db = null; }
  };
  return api;
}
