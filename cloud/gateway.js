import { createHash } from 'node:crypto';
import { emptyData, parseBackup, validateFood, validateEntry, validateCheckin, validateCardio, validateKnee } from '../js/data.js';
import { validateSessionIdentity } from '../js/session-identity.js';
import { validatePlanningDraft } from '../js/planning-draft.js';
import { restorePlanningDraft } from '../js/cloud-records.js';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const kinds = new Set(['workout', 'history_candidate', 'planning_draft', 'plan', 'exercise', 'food', 'meal_entry', 'saved_meal', 'recipe', 'journal', 'checkin', 'cardio', 'knee', 'account_settings', 'exercise_note']);
const fields = { plan: 'plans', exercise: 'customExercises', food: 'foods', meal_entry: 'entries', saved_meal: 'savedMeals', recipe: 'recipes', journal: 'journalEntries', checkin: 'checkins', cardio: 'cardioEntries', knee: 'kneeEntries' };
const commands = new Set(['import-records', 'update-records', 'delete-records', 'complete-workout', 'correct-history', 'update-planning']);
const fail = code => { throw new Error(code); };
const keysOnly = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 512 && !/[\u0000-\u001f]/.test(value);
export function sequence(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value) || value.length > 19 || BigInt(value) > 9223372036854775807n) fail('invalid_cursor');
  return value;
}
function boundedJson(value) {
  let nodes = 0;
  function walk(item, depth = 0) {
    if (++nodes > 50000 || depth > 48) fail('invalid_payload');
    if (typeof item === 'string' && (item.length > 250000 || /data:image\/|-----BEGIN .*PRIVATE KEY-----|\b(?:sb_secret_|sk-proj-|ghp_)[a-zA-Z0-9_-]{20,}/.test(item))) fail('invalid_payload');
    if (typeof item === 'number' && !Number.isFinite(item)) fail('invalid_payload');
    if (item !== null && !['string', 'number', 'boolean', 'object'].includes(typeof item)) fail('invalid_payload');
    if (object(item)) for (const [key, child] of Object.entries(item)) {
      if (/^(?:__proto__|constructor|prototype|access_token|refresh_token|service_role|apiKey|password|photoBlob|base64)$/i.test(key)) fail('invalid_payload');
      walk(child, depth + 1);
    }
    if (Array.isArray(item)) item.forEach(child => walk(child, depth + 1));
  }
  walk(value);
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 2097152) fail('payload_too_large');
}
export function validateOperation(value) {
  if (!keysOnly(value, ['protocolVersion', 'commandType', 'deviceId', 'operationId', 'dependencies', 'changes']) || value.protocolVersion !== 1 || !commands.has(value.commandType) || !uuid(value.deviceId) || !uuid(value.operationId) || !Array.isArray(value.dependencies) || value.dependencies.length || !Array.isArray(value.changes) || value.changes.length < 1 || value.changes.length > 100) fail('unsupported_operation');
  boundedJson(value);
  const seen = new Set();
  for (const c of value.changes) {
    if (!keysOnly(c, ['kind', 'recordId', 'action', 'baseRevision', 'payloadSchema', 'payload', 'phase']) || !kinds.has(c.kind) || !id(c.recordId) || !['create', 'update', 'delete'].includes(c.action) || c.payloadSchema !== 8 || !Object.hasOwn(c, 'baseRevision')) fail('invalid_change');
    if (c.baseRevision !== null) sequence(c.baseRevision);
    if ((c.action === 'create') !== (c.baseRevision === null) || (c.action !== 'create' && c.baseRevision === '0') || (c.action !== 'delete' && !object(c.payload)) || (c.action === 'delete' && c.payload !== undefined && c.payload !== null)) fail('invalid_change');
    const key = JSON.stringify([c.kind, c.recordId]); if (seen.has(key)) fail('duplicate_change'); seen.add(key);
    if (c.kind === 'workout' && c.action !== 'delete' && !['live', 'completed'].includes(c.phase)) fail('invalid_phase');
    if (c.kind !== 'workout' && c.phase !== undefined) fail('invalid_phase');
    const expected = { 'import-records': 'create', 'update-records': 'update', 'delete-records': 'delete' }[value.commandType];
    if (expected && c.action !== expected && !(value.commandType === 'delete-records' && c.kind === 'account_settings' && c.action === 'update' && c.payload?.activePlanId === null)) fail('command_action_mismatch');
    if (value.commandType === 'complete-workout' && (c.kind !== 'workout' || c.action !== 'update' || c.phase !== 'completed')) fail('command_action_mismatch');
    if (value.commandType === 'correct-history' && !((c.kind === 'workout' && c.action === 'update' && c.phase === 'completed') || (c.kind === 'history_candidate' && c.action === 'delete'))) fail('command_action_mismatch');
    if (value.commandType === 'update-planning' && !['plan', 'exercise', 'account_settings', 'planning_draft'].includes(c.kind) && !(c.kind === 'workout' && c.action === 'create' && c.phase === 'live' && value.changes.some(other => other.kind === 'planning_draft' && ['create','update','delete'].includes(other.action)))) fail('command_action_mismatch');
  }
  return structuredClone(value);
}
function ordered(records) { return [...records].sort((a, b) => BigInt(a.position) < BigInt(b.position) ? -1 : BigInt(a.position) > BigInt(b.position) ? 1 : a.recordId.localeCompare(b.recordId)); }
export function validateProjection(state, input) {
  const op = validateOperation(input);
  sequence(state.headSequence);
  if (!Array.isArray(state.records)) fail('invalid_state');
  const records = new Map(state.records.map(r => [JSON.stringify([r.kind, r.recordId]), structuredClone(r)]));
  if (op.commandType === 'correct-history') {
    const accepted = op.changes.filter(c => c.kind === 'workout'), candidates = op.changes.filter(c => c.kind === 'history_candidate');
    if (accepted.length !== 1 || candidates.length !== 1 || op.changes.length !== 2) fail('invalid_correction');
    const source = records.get(JSON.stringify(['workout', accepted[0].recordId]));
    const candidate = records.get(JSON.stringify(['history_candidate', candidates[0].recordId]));
    if (!source || source.deleted || source.phase !== 'completed' || !candidate || candidate.deleted || candidate.deviceId !== op.deviceId || candidate.payload.sourceSessionId !== source.recordId || canonical(candidate.payload.session.historyEditBase) !== canonical(source.payload)) fail('semantic_conflict');
    const { historyEditBase, ...corrected } = candidate.payload.session;
    if (canonical(corrected) !== canonical(accepted[0].payload)) {
      // The existing Complete command adds exactly one domain revision and a
      // client audit timestamp. Every reviewed exercise/set/value stays exact.
      // Preserve Batch1's exact-payload correction path above.
      const completed = structuredClone(corrected), submitted = accepted[0].payload;
      const timestamp = submitted.updatedAt;
      if (!object(completed.sessionStructure) || !Number.isSafeInteger(completed.sessionStructure.revision)
        || completed.sessionStructure.revision >= Number.MAX_SAFE_INTEGER || !completed.sets?.length
        || typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))
        || new Date(timestamp).toISOString() !== timestamp) fail('invalid_correction');
      completed.sessionStructure.revision++;
      completed.updatedAt = timestamp;
      if (canonical(completed) !== canonical(submitted)) fail('invalid_correction');
    }
  }
  for (const c of op.changes) {
    const key = JSON.stringify([c.kind, c.recordId]), old = records.get(key);
    if (c.action === 'create' ? !!old : !old || old.deleted || old.revision !== c.baseRevision) fail('revision_conflict');
    if (old?.deviceId && old.deviceId !== op.deviceId) fail('draft_device_mismatch');
    if (c.kind === 'planning_draft' && c.recordId !== op.deviceId) fail('draft_device_mismatch');
    if (old?.kind === 'workout' && c.action !== 'delete') {
      if (old.phase === 'completed' && (op.commandType !== 'correct-history' || c.phase !== 'completed')) fail('history_requires_correction');
      if (old.phase === 'live' && c.phase === 'completed' && op.commandType !== 'complete-workout') fail('completion_required');
      if (old.phase === 'live' && op.commandType === 'correct-history') fail('history_requires_correction');
    }
    if (c.kind === 'workout' && c.action === 'create' && c.phase === 'completed' && op.commandType !== 'import-records') fail('completion_required');
    if (c.action !== 'delete' && !['account_settings', 'exercise_note', 'planning_draft', 'history_candidate'].includes(c.kind) && c.payload.id !== c.recordId) fail('record_id_mismatch');
    const positions = [...records.values()].filter(r => r.kind === c.kind).map(r => BigInt(r.position));
    const position = old?.position ?? String(positions.length ? positions.reduce((a, b) => a > b ? a : b) + 1n : 0n);
    records.set(key, { ...old, ...c, position, deleted: c.action === 'delete', deviceId: ['planning_draft', 'history_candidate'].includes(c.kind) ? op.deviceId : null });
  }
  const data = emptyData();
  for (const r of ordered([...records.values()].filter(r => !r.deleted))) {
    const p = r.payload;
    if (fields[r.kind]) data[fields[r.kind]].push(p);
    else if (r.kind === 'account_settings') {
      if (r.recordId !== 'default' || !keysOnly(p, ['settings', 'activePlanId']) || !Object.hasOwn(p, 'activePlanId') || !object(p.settings) || !keysOnly(p.settings, ['week', 'calories', 'protein'])) fail('invalid_settings');
      data.settings = p.settings; data.activePlanId = p.activePlanId;
    } else if (r.kind === 'exercise_note') {
      if (!keysOnly(p, ['text']) || typeof p.text !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(r.recordId)) fail('invalid_note');
      data.exerciseNotes[r.recordId] = p.text;
    } else if (r.kind === 'planning_draft') validatePlanningDraft(restorePlanningDraft(p));
    else if (r.kind === 'history_candidate') {
      if (!keysOnly(p, ['sourceSessionId', 'session']) || !id(p.sourceSessionId) || !object(p.session) || p.session.id !== p.sourceSessionId) fail('invalid_history_candidate');
      const candidate = emptyData(); candidate.draft = p.session; parseBackup(JSON.stringify(candidate));
      validateSessionIdentity(p.session);
    } else if (r.kind === 'workout') {
      if (Object.hasOwn(p, 'historyEditBase')) fail('history_baseline_device_only');
      if (r.phase === 'completed') data.sessions.push(p);
      else if (r.phase === 'live') { const isolated = emptyData(); isolated.draft = p; parseBackup(JSON.stringify(isolated)); }
      else fail('invalid_phase');
    }
    if (r.kind === 'food') validateFood(p);
    if (r.kind === 'meal_entry') validateEntry(p);
    if (r.kind === 'checkin') validateCheckin(p);
    if (r.kind === 'cardio') validateCardio(p);
    if (r.kind === 'knee') validateKnee(p);
  }
  // Reuse existing snapshot/identity/domain contracts without migrating persisted local data.
  parseBackup(JSON.stringify(data));
  return { ...op, validatedHead: state.headSequence, readSet: state.records.map(r => ({ kind: r.kind, recordId: r.recordId, revision: r.revision })) };
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const operationFingerprint = value => createHash('sha256').update(canonical(value)).digest('hex');

export function createSqlStore(query) {
  const run = async (name, scope, args, casts) => {
    const values = [scope.uid, scope.environment, scope.projectId, ...args];
    const sql = `SELECT tracker_sync.${name}(${['uuid', 'text', 'text', ...casts].map((cast, i) => `$${i + 1}::${cast}`).join(',')}) AS result`;
    return (await query(sql, values)).rows[0].result;
  };
  return {
    readState: scope => run('read_state', scope, [], []),
    lookupReceipt: (scope, op) => run('lookup_receipt', scope, [op], ['uuid']),
    push: (scope, op, fingerprint) => run('push', scope, [JSON.stringify(op), fingerprint], ['jsonb', 'text']),
    reject: (scope, op, fingerprint, status, code) => run('record_rejection', scope, [JSON.stringify(op), fingerprint, status, code], ['jsonb', 'text', 'text', 'text']),
    pull: (scope, after, limit) => run('pull', scope, [after, limit], ['text', 'integer']),
    bootstrap: (scope, head, cursor, limit) => run('bootstrap', scope, [head, cursor === null ? null : JSON.stringify(cursor), limit], ['text', 'jsonb', 'integer'])
  };
}
export function createIdentityVerifier({ projectUrl, publishableKey, fetchImpl = fetch, now = Date.now }) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(projectUrl) || !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(publishableKey)) fail('invalid_provider_config');
  return async authorization => {
    if (typeof authorization !== 'string' || authorization.length > 16384 || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)) fail('unauthorized');
    const token = authorization.slice(7);
    let claims; try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { fail('unauthorized'); }
    // Decoded JWT is ONLY an early deny filter. The fixed-project Auth server is authoritative.
    if (token.split('.').length !== 3 || claims.iss !== projectUrl + '/auth/v1' || claims.aud !== 'authenticated' || !uuid(claims.sub) || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now()) fail('unauthorized');
    const response = await fetchImpl(projectUrl + '/auth/v1/user', { method: 'GET', headers: { apikey: publishableKey, Authorization: authorization }, redirect: 'error', signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) fail('unauthorized');
    const user = await response.json();
    if (!uuid(user?.id) || user.id !== claims.sub || user.role !== 'authenticated' || user.aud !== 'authenticated' || !user.email_confirmed_at || user.is_anonymous === true) fail('unauthorized');
    return { uid: user.id };
  };
}
export function createGateway({ verifyIdentity, store, environment, projectId, allowWrites = false }) {
  if (!['test', 'preview', 'production'].includes(environment) || !id(projectId)) fail('invalid_scope');
  return { async handle({ route, authorization, body }) {
    let identity;
    try { identity = await verifyIdentity(authorization); if (!uuid(identity?.uid)) fail('unauthorized'); }
    catch { return { status: 'error', code: 'unauthorized' }; }
    const scope = { uid: identity.uid, environment, projectId };
    try {
      if (route === 'push') {
        if (!allowWrites) return { status: 'error', code: 'writes_disabled' };
        const op = validateOperation(body), fingerprint = operationFingerprint(op);
        // SQL checks stored fingerprint/device even for retries; never bypass idempotency collision checks.
        if (await store.lookupReceipt(scope, op.operationId)) return await store.push(scope, op, fingerprint);
        const state = await store.readState(scope);
        let validated;
        try { validated = validateProjection(state, op); }
        catch (error) {
          const conflict = ['revision_conflict', 'semantic_conflict'].includes(error.message);
          return await store.reject(scope, op, fingerprint, conflict ? 'conflict' : 'rejected', conflict ? error.message : 'invalid_payload');
        }
        return await store.push(scope, validated, fingerprint);
      }
      if (route === 'pull') {
        if (!keysOnly(body, ['afterSequence', 'limit']) || !Number.isInteger(body.limit) || body.limit < 1 || body.limit > 100) fail('invalid_cursor');
        return await store.pull(scope, sequence(body.afterSequence), body.limit);
      }
      if (route === 'bootstrap') {
        if (!keysOnly(body, ['headSequence', 'cursor', 'limit']) || !Number.isInteger(body.limit) || body.limit < 1 || body.limit > 100 || !(body.cursor === null || keysOnly(body.cursor, ['kind', 'recordId']) && kinds.has(body.cursor.kind) && id(body.cursor.recordId) && body.headSequence !== null)) fail('invalid_cursor');
        return await store.bootstrap(scope, body.headSequence === null ? null : sequence(body.headSequence), body.cursor, body.limit);
      }
      if (route === 'receipt') {
        if (!keysOnly(body, ['operationId']) || !uuid(body.operationId)) fail('invalid_operation');
        return await store.lookupReceipt(scope, body.operationId) ?? { status: 'not_found' };
      }
      return { status: 'error', code: 'unknown_route' };
    } catch (error) {
      // No SQL details, provider bodies, payloads, tokens or credential strings leave this boundary.
      return { status: 'error', code: ['unsupported_operation', 'invalid_change', 'invalid_cursor', 'invalid_payload', 'duplicate_change', 'command_action_mismatch', 'payload_too_large'].includes(error.message) ? error.message : 'request_failed' };
    }
  } };
}
