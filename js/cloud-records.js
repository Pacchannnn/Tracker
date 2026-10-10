import { emptyData, parseBackup } from './data.js?v=41';
import { validateSessionIdentity } from './session-identity.js?v=41';
import { validatePlanningDraft } from './planning-draft.js?v=41';

const fields = { plan: 'plans', exercise: 'customExercises', food: 'foods', meal_entry: 'entries', saved_meal: 'savedMeals', recipe: 'recipes', journal: 'journalEntries', checkin: 'checkins', cardio: 'cardioEntries', knee: 'kneeEntries' };
export const recordKey = record => JSON.stringify([record.kind, record.recordId]);
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
const equal = (a, b) => canonical(a) === canonical(b);
const assertDevice = device => { if (typeof device !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(device)) throw Error('invalid_device'); };
export function restorePlanningDraft(value) {
  const payload = structuredClone(value);
  // JSONB does not preserve object key order. The existing schema8 planner
  // key records that exact order; reuse it only when every value matches.
  if (payload?.planner?.payload) {
    const planner = payload.planner.payload; let preferences;
    try { preferences = JSON.parse(planner.requestKey); } catch { throw Error('invalid_planner_request_key'); }
    if (canonical(preferences) !== canonical(planner.preferences)) throw Error('invalid_planner_request_key');
    planner.preferences = preferences;
  }
  validatePlanningDraft(payload); return payload;
}
export function validateAccountData(data) {
  if (data?.schemaVersion !== 8) throw Error('unsupported_schema');
  parseBackup(JSON.stringify(data));
  for (const session of [...data.sessions, ...(data.draft ? [data.draft] : [])]) validateSessionIdentity(session);
  return data;
}
function workoutPayload(session) {
  const copy = structuredClone(session); delete copy.historyEditBase; return copy;
}
export function recordsFromData(data, deviceId) {
  assertDevice(deviceId); validateAccountData(data);
  const records = [], add = (kind, recordId, payload, extra = {}) => records.push({ kind, recordId, payloadSchema: 8, payload: structuredClone(payload), position: String(records.filter(r => r.kind === kind).length), ...extra });
  for (const [kind, field] of Object.entries(fields)) for (const item of data[field]) add(kind, item.id, item);
  for (const session of data.sessions) {
    if (Object.hasOwn(session, 'historyEditBase')) throw Error('completed_baseline_forbidden');
    add('workout', session.id, session, { phase: 'completed' });
  }
  if (data.draft) {
    const session = data.draft;
    if (session.historyEditBase != null) add('history_candidate', `${deviceId}:${session.id}`, { sourceSessionId: session.id, session }, { deviceId });
    else add('workout', session.id, workoutPayload(session), { phase: 'live' });
  }
  add('account_settings', 'default', { settings: data.settings, activePlanId: data.activePlanId });
  add('planning_draft', deviceId, data.planningDraft, { deviceId });
  for (const [key, text] of Object.entries(data.exerciseNotes)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('invalid_note_key');
    add('exercise_note', key, { text });
  }
  if (new Set(records.map(recordKey)).size !== records.length) throw Error('duplicate_record');
  return records;
}
export function projectionFromRecords(records, deviceId, selectedLiveId = null) {
  assertDevice(deviceId); if (!Array.isArray(records)) throw Error('invalid_records');
  const data = emptyData(), seen = new Set();
  const ordered = [...records].sort((a, b) => {
    const pa = BigInt(a.position ?? '0'), pb = BigInt(b.position ?? '0');
    return pa < pb ? -1 : pa > pb ? 1 : recordKey(a).localeCompare(recordKey(b));
  });
  for (const r of ordered) {
    const key = recordKey(r);
    if (seen.has(key) || r.payloadSchema !== 8 || typeof r.recordId !== 'string' || !r.recordId) throw Error('invalid_records');
    seen.add(key); if (r.deleted) continue;
    const payload = structuredClone(r.payload);
    if (fields[r.kind]) {
      if (payload?.id !== r.recordId) throw Error('record_id_mismatch');
      data[fields[r.kind]].push(payload);
    } else if (r.kind === 'account_settings') {
      if (r.recordId !== 'default') throw Error('invalid_settings');
      data.settings = payload.settings; data.activePlanId = payload.activePlanId;
    } else if (r.kind === 'exercise_note') {
      if (['__proto__', 'constructor', 'prototype'].includes(r.recordId) || typeof payload?.text !== 'string') throw Error('invalid_note');
      data.exerciseNotes[r.recordId] = payload.text;
    } else if (r.kind === 'planning_draft') {
      if (r.recordId !== r.deviceId) throw Error('draft_device_mismatch');
      const restored = restorePlanningDraft(payload);
      if (r.deviceId === deviceId) data.planningDraft = restored;
    } else if (r.kind === 'workout') {
      if (payload?.id !== r.recordId || Object.hasOwn(payload, 'historyEditBase')) throw Error('invalid_workout');
      validateSessionIdentity(payload);
      const isolated = emptyData(); isolated.draft = payload; validateAccountData(isolated);
      if (r.phase === 'completed') data.sessions.push(payload);
      else if (r.phase === 'live') {
        if (selectedLiveId === r.recordId) data.draft = payload.sessionStructure ? { ...payload, historyEditBase: null } : payload;
      } else throw Error('invalid_phase');
    } else if (r.kind === 'history_candidate') {
      if (payload?.session?.id !== payload?.sourceSessionId || payload.session.historyEditBase == null || !r.deviceId) throw Error('invalid_history_candidate');
      const isolated = emptyData(); isolated.draft = payload.session; validateAccountData(isolated);
      if (r.deviceId === deviceId && (selectedLiveId === r.recordId || selectedLiveId === payload.sourceSessionId)) data.draft = payload.session;
    } else throw Error('unsupported_kind');
  }
  validateAccountData(data); return data;
}
export function diffRecords(before, after, deviceId) {
  const old = new Map(recordsFromData(before, deviceId).map(r => [recordKey(r), r]));
  const next = new Map(recordsFromData(after, deviceId).map(r => [recordKey(r), r]));
  const changes = [];
  for (const key of new Set([...old.keys(), ...next.keys()])) {
    const previous = old.get(key) ?? null, current = next.get(key) ?? null;
    if (previous && current && equal(previous.payload, current.payload) && previous.phase === current.phase) continue;
    const r = current ?? previous;
    changes.push({ kind: r.kind, recordId: r.recordId, action: previous ? current ? 'update' : 'delete' : 'create', payloadSchema: 8,
      ...(current ? { payload: structuredClone(current.payload), ...(current.phase ? { phase: current.phase } : {}) } : {}), before: previous, after: current });
  }
  return changes;
}
export function buildLocalIntent(workspace, nextData) {
  const changes = diffRecords(workspace.data, nextData, workspace.deviceId);
  if (!changes.length) return null;
  let commandType;
  if (changes.length === 2 && changes.some(c => c.kind === 'history_candidate' && c.action === 'delete') && changes.some(c => c.kind === 'workout' && c.action === 'update' && c.phase === 'completed')) commandType = 'correct-history';
  else if (changes.every(c => c.kind === 'workout' && c.action === 'update' && c.before.phase === 'live' && c.phase === 'completed')) commandType = 'complete-workout';
  else if (changes.every(c => ['plan', 'exercise', 'account_settings', 'planning_draft'].includes(c.kind))) commandType = 'update-planning';
  else if (changes.some(c => c.kind === 'workout' && c.action === 'create' && c.phase === 'live') && changes.some(c => c.kind === 'planning_draft' && ['update', 'delete'].includes(c.action)) && changes.every(c => c.kind === 'workout' && c.action === 'create' && c.phase === 'live' || c.kind === 'planning_draft' && ['update', 'delete'].includes(c.action))) commandType = 'update-planning';
  else if (changes.every(c => c.action === 'create')) commandType = 'import-records';
  else if (changes.every(c => c.action === 'update')) commandType = 'update-records';
  else if (changes.every(c => c.action === 'delete' || c.kind === 'account_settings' && c.action === 'update' && c.payload.activePlanId === null)) commandType = 'delete-records';
  else throw Error('unsupported_compound_change');
  const keys = new Set(changes.map(recordKey));
  const dependsOn = workspace.outbox.filter(intent => intent.changes.some(c => keys.has(recordKey(c)))).map(intent => intent.id);
  for (const change of changes) {
    change.base = structuredClone(workspace.shadow.find(r => recordKey(r) === recordKey(change)) ?? null);
    // A first intent binds the acknowledged revision; successors keep the candidate
    // they actually edited until the preceding intent receives its receipt.
    const predecessor = workspace.outbox.some(intent => intent.changes.some(c => recordKey(c) === recordKey(change)));
    if (!predecessor) change.before = structuredClone(change.base);
  }
  return { id: crypto.randomUUID(), deviceId: workspace.deviceId, commandType, changes, dependsOn, request: null, state: 'queued' };
}
