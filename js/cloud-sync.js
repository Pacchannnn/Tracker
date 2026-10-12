import { projectionFromRecords } from './cloud-records.js';

const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const key = r => JSON.stringify([r.kind, r.recordId]);
const fail = code => { throw new Error(code); };
function sequence(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value) || value.length > 19 || BigInt(value) > 9223372036854775807n) fail('invalid_response');
  return BigInt(value);
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const equal = (a, b) => canonical(a) === canonical(b);
const kinds = new Set(['workout', 'history_candidate', 'planning_draft', 'plan', 'exercise', 'food', 'meal_entry', 'saved_meal', 'recipe', 'journal', 'checkin', 'cardio', 'knee', 'account_settings', 'exercise_note','photo']);
function records(value, head) {
  if (!Array.isArray(value)) fail('invalid_response');
  const seen = new Set();
  for (const r of value) {
    if (!object(r) || !kinds.has(r.kind) || typeof r.recordId !== 'string' || !r.recordId || r.recordId.length > 512 || /[\u0000-\u001f]/.test(r.recordId)
      || sequence(r.revision) < 1n || sequence(r.commitSequence) < 1n || sequence(r.commitSequence) > sequence(head) || sequence(r.position) < 0n
      || r.payloadSchema !== 8 || !object(r.payload) || typeof r.deleted !== 'boolean' || !Object.hasOwn(r, 'phase') || !Object.hasOwn(r, 'deviceId')
      || (r.kind === 'workout' ? !['live', 'completed'].includes(r.phase) : r.phase !== null)
      || (['planning_draft', 'history_candidate'].includes(r.kind) ? !uuid(r.deviceId) : r.deviceId !== null)
      || (r.kind === 'planning_draft' && r.recordId !== r.deviceId) || (r.sourceSessionId !== null && r.sourceSessionId !== undefined && typeof r.sourceSessionId !== 'string') || seen.has(key(r))) fail('invalid_response');
    seen.add(key(r));
  }
  return value;
}
export function validateFeedRecords(value,head){records(value,head);return value;}
function mergeRecords(shadow, incoming) {
  const map = new Map(shadow.map(r => [key(r), r]));
  for (const r of incoming) {
    const before = map.get(key(r));
    if (!before || sequence(r.revision) > sequence(before.revision)) map.set(key(r), clone(r));
    else if (r.revision === before.revision && !equal(r, before)) fail('invalid_response');
  }
  return [...map.values()];
}
function candidate(change) {
  if (change.after !== undefined) return change.after;
  if (change.action === 'delete') return null;
  return { kind: change.kind, recordId: change.recordId, payloadSchema: 8, payload: change.payload, ...(change.phase ? { phase: change.phase } : {}) };
}
export function projectAccountWorkspace(workspace) {
  const map = new Map(workspace.shadow.map(r => [key(r), clone(r)]));
  for (const intent of workspace.outbox) for (const change of intent.changes) {
    const next = candidate(change), previous = map.get(key(change));
    if (next === null || change.action === 'delete') map.delete(key(change));
    else map.set(key(change), { ...previous, ...clone(next), kind: change.kind, recordId: change.recordId, deleted: false, position: next.position ?? previous?.position ?? '9223372036854775807', deviceId: ['planning_draft', 'history_candidate'].includes(change.kind) ? workspace.deviceId : null });
  }
  workspace.data = projectionFromRecords([...map.values()], workspace.deviceId, workspace.selectedLiveId);
  return workspace.data;
}
const project = projectAccountWorkspace;
function matchesAck(intent, response) {
  if (response.status !== 'applied' || response.operationId !== intent.id || !uuid(response.operationId) || !intent.request || !Array.isArray(intent.requestBase)) fail('invalid_acknowledgement');
  const request = intent.request, list = records(response.records, response.commitSequence);
  if (sequence(response.commitSequence) < 1n || list.length !== request.changes.length) fail('invalid_acknowledgement');
  const map = new Map(list.map(r => [key(r), r]));
  request.changes.forEach((c, index) => {
    const accepted = map.get(key(c)), base = intent.requestBase[index];
    if (!accepted || accepted.commitSequence !== response.commitSequence || accepted.revision !== String(c.baseRevision === null ? 1n : sequence(c.baseRevision) + 1n)
      || accepted.deleted !== (c.action === 'delete') || !equal(accepted.payload, c.action === 'delete' ? base?.payload : c.payload)
      || accepted.phase !== (c.kind === 'workout' ? c.action === 'delete' ? base?.phase : c.phase : null)
      || accepted.deviceId !== (['planning_draft', 'history_candidate'].includes(c.kind) ? request.deviceId : null)
      || accepted.sourceSessionId !== (c.action === 'delete' ? base?.sourceSessionId : c.kind === 'history_candidate' ? c.payload.sourceSessionId : null)
      || (base && accepted.position !== base.position)
      || (base && sequence(response.commitSequence) <= sequence(base.commitSequence))) fail('invalid_acknowledgement');
  });
  return list;
}
function retire(workspace, intent, response) {
  const accepted = matchesAck(intent, response);
  workspace.shadow = mergeRecords(workspace.shadow, accepted);
  workspace.receipts ??= [];
  workspace.receipts.push({ operationId: intent.id, request: clone(intent.request), records: clone(accepted), commitSequence: response.commitSequence });
  workspace.outbox = workspace.outbox.filter(item => item.id !== intent.id);
}
function chain(workspace, id) {
  const ids = new Set([id]); let changed = true;
  while (changed) { changed = false; for (const intent of workspace.outbox) if (!ids.has(intent.id) && intent.dependsOn?.some(dep => ids.has(dep))) { ids.add(intent.id); changed = true; } }
  return workspace.outbox.filter(intent => ids.has(intent.id));
}
function createConflict(workspace, intent, code) {
  if (workspace.conflicts.some(c => c.status === 'unresolved' && c.intentIds.includes(intent.id))) return;
  const affected = chain(workspace, intent.id), baseline = new Map(), local = new Map(), shadow = new Map(workspace.shadow.map(r => [key(r), r]));
  for (const item of affected) for (const c of item.changes) {
    if (!baseline.has(key(c))) baseline.set(key(c), clone(c.base ?? c.before ?? null));
    local.set(key(c), { kind: c.kind, recordId: c.recordId, record: clone(candidate(c)) });
  }
  const identities = [...local.values()].map(r => ({ kind: r.kind, recordId: r.recordId }));
  workspace.conflicts.push({ id: crypto.randomUUID(), operationId: intent.id, status: 'unresolved', code, intentIds: affected.map(i => i.id), identities,
    base: identities.map(r => baseline.get(key(r))), local: identities.map(r => local.get(key(r)).record), remote: identities.map(r => clone(shadow.get(key(r)) ?? null)), reviewToken: crypto.randomUUID() });
  affected.forEach(item => { item.state = 'conflict'; });
}
function wireRequest(workspace, intent) {
  const shadow = new Map(workspace.shadow.map(r => [key(r), r]));
  const bases = intent.changes.map(c => clone(shadow.get(key(c)) ?? null));
  const changes = intent.changes.map((c, index) => {
    const current = bases[index], before = c.before ?? null;
    // Descendants were explicitly based on predecessor's candidate; only bind after its receipt.
    const dependencyReceipts = intent.dependsOn?.length && intent.dependsOn.every(id => workspace.receipts?.some(r => r.operationId === id));
    const priorAccepted = dependencyReceipts ? workspace.receipts.filter(r => intent.dependsOn.includes(r.operationId)).flatMap(r => r.records).filter(r => key(r) === key(c)).at(-1) : null;
    const acknowledgedDependency = Boolean(priorAccepted);
    if (current?.deleted || (!acknowledgedDependency && (before?.revision !== current?.revision || before === null && current !== null))
      || acknowledgedDependency && before && (!current || !priorAccepted || current.revision !== priorAccepted.revision || !equal(before.payload, current.payload) || (before.phase ?? null) !== current.phase)) fail('revision_conflict');
    const next = candidate(c), action = next === null || c.action === 'delete' ? 'delete' : current ? 'update' : 'create';
    if (action === 'delete' && !current) fail('revision_conflict');
    return { kind: c.kind, recordId: c.recordId, action, baseRevision: current?.revision ?? null, payloadSchema: 8,
      ...(action !== 'delete' ? { payload: clone(next.payload), ...(c.kind === 'workout' ? { phase: next.phase ?? c.phase } : {}) } : {}) };
  });
  let commandType = intent.commandType;
  if (['import-records', 'update-records', 'delete-records'].includes(commandType)) {
    if (changes.every(c => c.action === 'create')) commandType = 'import-records';
    else if (changes.every(c => c.action === 'update')) commandType = 'update-records';
    else if (changes.every(c => c.action === 'delete' || c.kind === 'account_settings' && c.action === 'update' && c.payload.activePlanId === null)) commandType = 'delete-records';
    else fail('unsupported_compound_change');
  }
  intent.requestBase = bases;
  intent.request = { protocolVersion: 1, commandType, deviceId: workspace.deviceId, operationId: intent.id, dependencies: [], changes };
  intent.state = 'sending';
}

// All responses cross a lease guard and one durable account-store transaction.
// Network failure leaves frozen request bytes and candidate history intact.
export function createSyncEngine({ store, scope, transport, isCurrent = () => false, onChange = () => {}, pageLimit = 50, protocolVersion = 1 } = {}) {
  if(![1,2].includes(protocolVersion))fail('unsupported_protocol');
  if (!store || !transport?.call || !uuid(scope?.uid) || !['test', 'preview', 'production'].includes(scope?.environment) || typeof scope?.projectId !== 'string' || !scope.projectId || !Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100) fail('invalid_scope');
  const ownedScope = clone(scope);
  let epoch = 0, paused = null, running = null, controller = new AbortController();
  const current = ticket => ticket === epoch && !paused && !controller.signal.aborted && isCurrent();
  async function read() {
    if (!isCurrent()) fail('workspace_sealed');
    const w = await store.read(ownedScope);
    if (!equal(w.scope, ownedScope)) fail('scope_mismatch');
    return w;
  }
  async function update(ticket, mutator) {
    for (let attempt = 0; attempt < 8; attempt++) {
      if (!current(ticket)) fail('workspace_sealed');
      const w = await read();
      try {
        return await store.transact(ownedScope, w.localRevision, next => {
          if (!current(ticket) || !equal(next.scope, ownedScope)) fail('workspace_sealed');
          mutator(next);
          if (!current(ticket)) fail('workspace_sealed');
        });
      } catch (error) { if (!['workspace_changed', 'revision_conflict_local', 'stale_revision'].includes(error.message)) throw error; }
    }
    fail('workspace_changed');
  }
  async function status() {
    let w; try { w = await read(); } catch { return { status: 'auth', pending: null, conflicts: null, initialized: false }; }
    const conflicts = w.conflicts.filter(c => c.status === 'unresolved').length, pending = w.outbox.length;
    const state = paused === 'auth' || !isCurrent() ? 'auth' : paused ? 'paused' : conflicts ? 'conflict' : running ? 'syncing' : w.syncError?.status ?? (!w.initialized || pending ? 'pending' : 'synced');
    return { status: state, pending, conflicts, initialized: w.initialized, cursor: w.cursor, code: w.syncError?.code ?? null };
  }
  async function publish() { try { onChange(await status()); } catch { /* UI observers cannot acknowledge records. */ } }
  async function call(ticket, route, body) {
    if (!current(ticket)) fail('workspace_sealed');
    const result = await transport.call(route, clone(body), { signal: controller.signal });
    if (!current(ticket)) fail('workspace_sealed');
    if (result?.status === 'error') fail(result.code === 'unauthorized' ? 'unauthorized' : 'gateway_unavailable');
    return result;
  }
  async function bootstrap(ticket) {
    while (current(ticket)) {
      const w = await read(); if (w.initialized) return;
      const staged = w.bootstrap;
      const response = await call(ticket, protocolVersion===2?'bootstrap-v2':'bootstrap', { headSequence: staged?.headSequence ?? null, cursor: staged?.cursor ?? null, limit: pageLimit });
      const head = sequence(response?.headSequence);
      if (staged && (response.headSequence !== staged.headSequence || response.snapshotRecordCount !== staged.snapshotRecordCount) || !Number.isSafeInteger(response.snapshotRecordCount) || response.snapshotRecordCount < 0 || typeof response.hasMore !== 'boolean') fail('invalid_response');
      records(response.records, String(head));
      if(protocolVersion===1&&response.records.some(record=>record.kind==='photo'))fail('invalid_response');
      const prev = staged?.cursor;
      // Keyset ordering is the database's collation, not JavaScript UTF-16/JSON order.
      if (response.records.length > pageLimit || prev && equal(prev, response.cursor)) fail('invalid_response');
      if (response.hasMore && (!response.records.length || !object(response.cursor) || !equal(response.cursor, { kind: response.records.at(-1).kind, recordId: response.records.at(-1).recordId })) || !response.hasMore && response.cursor !== null) fail('invalid_response');
      await update(ticket, next => {
        if (!equal(next.bootstrap, staged)) fail('workspace_changed');
        const all = [...(staged?.records ?? []), ...clone(response.records)];
        records(all, response.headSequence);
        if (all.length > response.snapshotRecordCount || response.hasMore && all.length >= response.snapshotRecordCount || !response.hasMore && all.length !== response.snapshotRecordCount) fail('invalid_response');
        if (response.hasMore) next.bootstrap = { headSequence: response.headSequence, snapshotRecordCount: response.snapshotRecordCount, cursor: clone(response.cursor), records: all };
        else { next.shadow = all; next.cursor = response.headSequence; next.initialized = true; next.bootstrap = null; project(next); }
        next.syncError = null;
      });
    }
  }
  async function pull(ticket) {
    while (current(ticket)) {
      const w = await read(), after = w.cursor;
      const response = await call(ticket, protocolVersion===2?'pull-v2':'pull', { afterSequence: after, limit: pageLimit });
      const head = sequence(response?.headSequence), cursor = sequence(response?.afterSequence);
      if (!Array.isArray(response.groups) || response.groups.length > pageLimit || typeof response.hasMore !== 'boolean' || head < cursor || cursor < sequence(after) || response.hasMore !== (cursor < head)) fail('invalid_response');
      let last = sequence(after); const operations = new Set();
      for (const group of response.groups) {
        if(protocolVersion===1&&group.records?.some(record=>record.kind==='photo'))fail('invalid_response');
        if (!uuid(group.operationId) || operations.has(group.operationId) || sequence(group.commitSequence) !== last + 1n || !group.records?.length || group.records.length > 100 || !Number.isSafeInteger(group.recordCount) || group.recordCount !== group.records.length) fail('invalid_response');
        operations.add(group.operationId); records(group.records, group.commitSequence);
        if (group.records.some(r => r.commitSequence !== group.commitSequence)) fail('invalid_response');
        last++;
      }
      if (last !== cursor || response.hasMore && !response.groups.length) fail('invalid_response');
      await update(ticket, next => {
        if (next.cursor !== after) fail('workspace_changed');
        for (const group of response.groups) {
          const own = next.outbox.find(i => i.id === group.operationId);
          if (own) retire(next, own, { ...group, status: 'applied' });
          next.shadow = mergeRecords(next.shadow, group.records);
        }
        next.cursor = response.afterSequence; project(next); next.syncError = null;
      });
      if (!response.hasMore) return;
    }
  }
  async function push(ticket) {
    while (current(ticket)) {
      const w = await read(), intent = w.outbox.find(i => i.state !== 'conflict' && !i.dependsOn?.some(id => w.outbox.some(p => p.id === id)));
      if (!intent) return;
      if (!intent.request) {
        await update(ticket, next => {
          const item = next.outbox.find(i => i.id === intent.id); if (!item || item.request || item.state === 'conflict') return;
          try { wireRequest(next, item); } catch (error) { if (error.message !== 'revision_conflict') throw error; createConflict(next, item, 'revision_conflict'); }
          project(next);
        });
      }
      const latest = (await read()).outbox.find(i => i.id === intent.id); if (!latest?.request || latest.state === 'conflict') continue;
      const response = await call(ticket, 'push', latest.request);
      if (response?.status === 'applied') await update(ticket, next => {
        const item = next.outbox.find(i => i.id === latest.id);
        if (!item) { const receipt = next.receipts?.find(r => r.operationId === latest.id); if (!receipt || !equal(receipt.records, response.records) || receipt.commitSequence !== response.commitSequence) fail('invalid_acknowledgement'); return; }
        if (!equal(item.request, latest.request)) fail('invalid_acknowledgement');
        retire(next, item, response); project(next); next.syncError = null;
      });
      else if (['conflict', 'rejected'].includes(response?.status) && response.operationId === latest.id && typeof response.code === 'string') {
        // Refresh latest accepted state before presenting the review snapshot.
        await pull(ticket);
        await update(ticket, next => { const item = next.outbox.find(i => i.id === latest.id); if (item) createConflict(next, item, response.code); project(next); });
      } else fail('invalid_acknowledgement');
      await publish();
    }
  }
  async function sync() {
    if (running) { await running; return status(); }
    if (paused || !isCurrent()) return status();
    const ticket = epoch;
    running = (async () => {
      await publish();
      try { await bootstrap(ticket); await pull(ticket); await push(ticket); }
      catch (error) {
        if (current(ticket)) await update(ticket, next => { next.syncError = { status: error.message === 'unauthorized' ? 'auth' : ['invalid_response', 'invalid_acknowledgement', 'scope_mismatch', 'workspace_changed'].includes(error.message) ? 'error' : 'offline', code: ['unauthorized', 'invalid_response', 'invalid_acknowledgement', 'scope_mismatch', 'workspace_changed'].includes(error.message) ? error.message : 'gateway_unavailable' }; }).catch(() => {});
      }
    })();
    try { await running; } finally { running = null; await publish(); }
    return status();
  }
  function pause(reason = 'paused') { paused = reason; epoch++; controller.abort(); controller = new AbortController(); void publish(); }
  function resume() { const previous = running; paused = null; epoch++; controller.abort(); controller = new AbortController(); return previous ? previous.then(() => sync()) : sync(); }
  async function readConflict(id) {
    const ticket = epoch; let result;
    await update(ticket, next => {
      const conflict = next.conflicts.find(c => c.id === id && c.status === 'unresolved'); if (!conflict) fail('conflict_missing');
      const map = new Map(next.shadow.map(r => [key(r), r]));
      const initialBase = new Map(conflict.identities.map((r, index) => [key(r), conflict.base[index]]));
      const currentChain = chain(next, conflict.operationId), identities = new Map(), local = new Map();
      for (const intent of currentChain) for (const c of intent.changes) {
        identities.set(key(c), { kind: c.kind, recordId: c.recordId }); local.set(key(c), clone(candidate(c)));
        if (!initialBase.has(key(c))) initialBase.set(key(c), clone(c.base ?? c.before ?? null));
        intent.state = 'conflict';
      }
      conflict.remoteAtConflict ??= clone(conflict.remote);
      conflict.identities = [...identities.values()]; conflict.intentIds = currentChain.map(i => i.id);
      conflict.base = conflict.identities.map(r => initialBase.get(key(r))); conflict.local = conflict.identities.map(r => local.get(key(r)));
      conflict.remote = conflict.identities.map(r => clone(map.get(key(r)) ?? null)); conflict.reviewToken = crypto.randomUUID(); result = clone(conflict);
    });
    return result;
  }
  async function resolveConflict(id, choice, reviewToken) {
    if (!['remote', 'local'].includes(choice)) return { applied: false, code: 'invalid_choice' };
    const ticket = epoch; let result = { applied: false, code: 'review_changed' };
    await update(ticket, next => {
      const conflict = next.conflicts.find(c => c.id === id && c.status === 'unresolved');
      const shadow = new Map(next.shadow.map(r => [key(r), r]));
      if (!conflict || conflict.reviewToken !== reviewToken || !equal(conflict.remote, conflict.identities.map(r => shadow.get(key(r)) ?? null))) return;
      const selected = next.outbox.filter(i => conflict.intentIds.includes(i.id));
      // Newly added descendants must be shown before they may be abandoned.
      if (!equal(chain(next, conflict.operationId).map(i => i.id), conflict.intentIds)) return;
      let replacement;
      if (choice === 'local') {
        if (conflict.local.some((r, index) => r && conflict.remote[index]?.deleted)) { result = { applied: false, code: 'copy_required' }; return; }
        if (!selected.length || new Set(selected.map(i => i.commandType)).size !== 1 && !selected.every(i => ['import-records', 'update-records', 'delete-records'].includes(i.commandType))) { result = { applied: false, code: 'compound_review_required' }; return; }
        const changes = conflict.identities.map((r, index) => {
          const remote = conflict.remote[index], local = conflict.local[index];
          return { ...r, action: !local ? 'delete' : remote ? 'update' : 'create', payloadSchema: 8, ...(local ? { payload: clone(local.payload), ...(local.phase ? { phase: local.phase } : {}) } : {}), before: clone(remote), after: clone(local) };
        }).filter((c, index) => !equal(conflict.remote[index]?.payload, conflict.local[index]?.payload) || (conflict.remote[index]?.phase ?? null) !== (conflict.local[index]?.phase ?? null) || !!conflict.remote[index] !== !!conflict.local[index]);
        if (changes.some(c => c.action === 'delete' && (!c.before || c.before.deleted))) { result = { applied: false, code: 'compound_review_required' }; return; }
        if (changes.length) replacement = { id: crypto.randomUUID(), commandType: selected[0].commandType, state: 'queued', request: null, dependsOn: [], changes };
      }
      conflict.status = 'resolved'; conflict.resolution = choice; conflict.archivedIntents = clone(selected);
      next.outbox = next.outbox.filter(i => !conflict.intentIds.includes(i.id)); if (replacement) next.outbox.push(replacement);
      project(next); next.syncError = null; result = { applied: true };
    });
    await publish(); return result;
  }
  return Object.freeze({ sync, pause, resume, status, readConflict, resolveConflict });
}
