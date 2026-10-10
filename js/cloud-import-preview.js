const SOURCES = Object.freeze({ sessions: 'workout', foods: 'food', entries: 'meal_entry', checkins: 'checkin', cardioEntries: 'cardio', kneeEntries: 'knee', savedMeals: 'saved_meal', recipes: 'recipe', journalEntries: 'journal', customExercises: 'exercise', plans: 'plan' });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertJson(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || seen.has(value) || !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Dữ liệu xem trước không phải JSON hợp lệ.');
  seen.add(value); for (const item of Object.values(value)) assertJson(item, seen); seen.delete(value);
}
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

// Preparation is deliberately read-only. No normalization, ID assignment or import command is emitted.
export function prepareImportPreview(anonymous, accountData, photoMetadata, scope) {
  if (!UUID.test(scope?.uid || '') || !['preview', 'production'].includes(scope.environment) || typeof scope.projectId !== 'string' || !scope.projectId.trim()) throw new Error('Cần đúng không gian tài khoản để xem trước.');
  assertJson(anonymous); assertJson(accountData);
  if (Array.isArray(anonymous) || Array.isArray(accountData)) throw new Error('Nguồn dữ liệu phải là đối tượng JSON.');
  const candidates = [], duplicates = [], ambiguities = [], counts = {};
  const ambiguity = (reason, detail = {}) => ambiguities.push({ reason, ...detail });
  if (anonymous.schemaVersion !== 8) ambiguity('unsupported-schema', { schemaVersion: anonymous.schemaVersion ?? null });
  const known = new Set([...Object.keys(SOURCES), 'schemaVersion', 'settings', 'activePlanId', 'exerciseNotes', 'draft', 'planningDraft']);
  for (const field of Object.keys(anonymous)) if (!known.has(field)) ambiguity('unknown-field', { field, value: structuredClone(anonymous[field]) });
  for (const [field, kind] of Object.entries(SOURCES)) {
    const items = anonymous[field] ?? [];
    if (!Array.isArray(items)) { ambiguity('invalid-collection', { field }); continue; }
    counts[kind] = items.length;
    const ids = new Map(); for (const item of items) if (typeof item?.id === 'string') ids.set(item.id, (ids.get(item.id) || 0) + 1);
    const existing = Array.isArray(accountData[field]) ? accountData[field] : [];
    const byId = new Map(existing.map(item => [item.id, item]));
    const sourceDates = new Map(); if (kind === 'journal') for (const item of items) if (item?.date) sourceDates.set(item.date, (sourceDates.get(item.date) || 0) + 1);
    items.forEach((item, index) => {
      const detail = { kind, recordId: item?.id ?? null, sourceIndex: index, payload: structuredClone(item) };
      if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim()) { ambiguity('missing-id', detail); return; }
      if (ids.get(item.id) > 1) { ambiguity('duplicate-source-id', detail); return; }
      if (byId.has(item.id)) { duplicates.push({ ...detail, samePayload: equal(item, byId.get(item.id)), remote: structuredClone(byId.get(item.id)) }); return; }
      if (kind === 'workout' && !Object.hasOwn(item, 'sessionStructure')) { ambiguity('legacy-workout-ownership-review', detail); return; }
      if (kind === 'journal' && (sourceDates.get(item.date) > 1 || existing.some(row => row.date === item.date))) { ambiguity('journal-date-collision', detail); return; }
      candidates.push(detail);
    });
  }
  if (anonymous.settings !== undefined) {
    const item = { kind: 'account_settings', recordId: 'default', payload: { settings: structuredClone(anonymous.settings), activePlanId: anonymous.activePlanId ?? null } };
    if (accountData.settings !== undefined) duplicates.push({ ...item, samePayload: equal(item.payload, { settings: accountData.settings, activePlanId: accountData.activePlanId ?? null }), remote: structuredClone(accountData.settings) });
    else candidates.push(item);
  }
  if (anonymous.exerciseNotes && typeof anonymous.exerciseNotes === 'object' && !Array.isArray(anonymous.exerciseNotes)) for (const [recordId, payload] of Object.entries(anonymous.exerciseNotes)) {
    const item = { kind: 'exercise_note', recordId, payload: structuredClone(payload) };
    if (Object.hasOwn(accountData.exerciseNotes || {}, recordId)) duplicates.push({ ...item, samePayload: equal(payload, accountData.exerciseNotes[recordId]), remote: structuredClone(accountData.exerciseNotes[recordId]) }); else candidates.push(item);
  }
  if (anonymous.draft) ambiguity('device-ownership-required', { field: 'draft', payload: structuredClone(anonymous.draft) });
  if (anonymous.planningDraft?.builder || anonymous.planningDraft?.planner) ambiguity('device-ownership-required', { field: 'planningDraft', payload: structuredClone(anonymous.planningDraft) });
  let photoBytes = null;
  if (Array.isArray(photoMetadata)) {
    assertJson(photoMetadata);
    if (photoMetadata.every(photo => Number.isSafeInteger(photo.byteSize) && photo.byteSize >= 0)) photoBytes = photoMetadata.reduce((sum, photo) => sum + photo.byteSize, 0);
    const owners = { food: new Set((Array.isArray(anonymous.foods) ? anonymous.foods : []).map(item => item?.id)), recipe: new Set((Array.isArray(anonymous.recipes) ? anonymous.recipes : []).map(item => item?.id)) };
    for (const photo of photoMetadata) if (photo.ownerType && !owners[photo.ownerType]?.has(photo.ownerId)) ambiguity('photo-owner-missing', { photoId: photo.id ?? null, ownerType: photo.ownerType, ownerId: photo.ownerId ?? null });
  } else ambiguity('photo-metadata-unavailable');
  return {
    counts, candidates, duplicates, ambiguities, jsonBytes: new TextEncoder().encode(JSON.stringify(anonymous)).length,
    photoCount: Array.isArray(photoMetadata) ? photoMetadata.length : null, photoBytes,
    ledgerContract: { version: 1, state: 'preview-only', sourceWorkspace: 'anonymous-local', sourceHash: null, targetUID: scope.uid, environment: scope.environment, projectId: scope.projectId, readyToImport: false, mapping: [], acceptedReceipts: [], requires: ['explicit-migration-approval', 'exact-source-hash', 'domain-validation', 'identity-ownership-review', 'duplicate-review', 'photo-consent'] }
  };
}
