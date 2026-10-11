import { PROGRAM, programDay, nextWorkout, weekGuidance } from './program.js?v=41';
import { emptyData, loadData, updateData, validateFood, validateEntry, validateCheckin, validateCardio, validateKnee, dailyTotals, localDate, weekStart, validDate, diaryDate, foodSnapshotForEntry, createBackup, parseBackup, ensureUnchanged, restoreBackupData } from './data.js?v=41';
import { createDraftStore } from './planning-draft.js?v=41';
import { navigationGroup } from './navigation.js?v=41';
import { restSeconds } from './workout.js?v=41';
import { weeklySummary, exerciseHistoryPage } from './progress.js?v=41';
import { searchFoods, scaleRecipe, copyDayEntries, savedMealFromEntries, useSavedMeal, validateRecipe, recipeTotals } from './nutrition.js?v=41';
import { MOODS, validateJournal, monthDays, recentJournalTags, toggleJournalTag, journalTagOptions } from './journal.js?v=41';
import { PHOTO_CATEGORIES, PHOTO_POSES, validatePhotoMeta, validatePhotoFile, compressPhoto, listPhotos, putPhoto, updatePhotoIfUnchanged, deletePhotoIfUnchanged, deleteDailyPhotos, addMissingPhotos, orphanPhotoOwners } from './photo-store.js?v=41';
import { createPhotoBackup, parsePhotoBackup } from './photo-backup.js?v=41';
import { snapshotWorkout, sessionTitle, nextPlanDay } from './custom-workout.js?v=41';
import { createGymBuilder } from './gym-builder-ui.js?v=41';
import { createPlannerUI } from './planner-ui.js?v=41';
import { createNutritionPhotos } from './nutrition-photo-ui.js?v=41';
import { createSessionStore } from './session-runtime.js?v=41';
import { runtimeView } from './session-readers.js?v=41';
import { createSessionUI } from './session-ui.js?v=41';
import { createMyDayUI } from './my-day-ui.js?v=41';
import { createJournalRetrievalUI } from './journal-retrieval-ui.js?v=41';
import { createNutritionBatchUI } from './nutrition-batch-ui.js?v=41';
import { createCookbookUI } from './cookbook-ui.js?v=41';
import { recipeFormValues } from './cookbook.js?v=41';
import { createLifeReviewUI } from './life-review-ui.js?v=41';
import { createMonthMemoriesUI } from './month-memories-ui.js?v=41';
import { readLifeData, resolveLifeSource } from './life-review-source.js?v=41';
import { listPhotoMetadata, getPhotoThumbnail } from './photo-store.js?v=41';
import { CLOUD_AUTH_CONFIG } from './cloud-config.js?v=41';
import { createSupabaseAuthAdapter, createCloudAuth } from './cloud-auth.js?v=41';
import { createCloudAuthUI } from './cloud-auth-ui.js?v=41';
import { createCloudWorkspace } from './cloud-workspace.js?v=43';
import { createCloudWorkspaceUI } from './cloud-workspace-ui.js?v=43';

const main = document.querySelector('#main');
const notice = document.querySelector('#notice');
const tabs = [...document.querySelectorAll('[data-view]')];
const trainingNav = document.querySelector('#training-nav');
const viewTitle = document.querySelector('#view-title');
let data;
let view = 'dashboard';
let editingFood = null;
let editingEntry = null;
let editingCheckin = null;
let foodDateSelection = { mode: 'today', date: localDate() };
let backupUrl = null;
let restoreSafetyUrl = null;
let restorePreview = null;
let photoBackupUrl = null;
let photoRestorePreview = null;
const backupState = { data: 'Chưa chuẩn bị file dữ liệu.', photos: 'Chưa chuẩn bị file ảnh.' };
function backupStatus(kind) { return p(backupState[kind], 'hint'); }
function setBackupStatus(kind, text) {
  backupState[kind] = text;
  const target = document.querySelector(`[data-backup-status=${kind}]`);
  if (target) target.textContent = text;
}
let selectedProgram = 'A';
let restTimer = null;
let editingCardio = null;
let editingKnee = null;
let progressSubView = 'overview';
let selectedExercise = '';
let nutritionSubView = 'daily';
let editingSavedMeal = null;
let editingRecipe = null;
let journalDate = localDate();
let journalSection = 'entry';
let journalReturnToResults = false;
let journalMonth = new Date().getMonth() + 1;
let journalYear = new Date().getFullYear();
let photoFilter = 'all';
let editingPhoto = null;
let photoUrls = [];
let daySourceContext = null;
let lifeSourceContext = null;
let lifeReturnContext = null;
let lifeSourceGeneration = 0;
let sourceFormBaseline = [];
let sourceNavigationBaseline = null;

function node(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === 'text') element.textContent = value;
    else if (key === 'class') element.className = value;
    else if (key === 'onClick') element.addEventListener('click', value);
    else if (key === 'value') element.value = value;
    else if (value !== null && value !== undefined) element.setAttribute(key, value);
  }
  for (const child of children) element.append(child);
  return element;
}
const button = (label, action, kind = 'secondary') => node('button', { type: 'button', class: kind, text: label, onClick: action });
const p = (text, cls = '') => node('p', { text, class: cls });
const h2 = text => node('h2', { text });
const h3 = text => node('h3', { text });
const panel = (...children) => node('section', { class: 'panel' }, children);
const div = (cls, ...children) => node('div', { class: cls }, children);
const fmt = value => value == null ? 'Chưa rõ' : Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
const id = () => crypto.randomUUID();

function field(label, name, value = '', options = {}) {
  const input = node(options.tag || 'input', { name, type: options.type || 'text', value: value ?? '', min: options.min, max: options.max, step: options.step, required: options.required ? '' : null });
  if (options.tag === 'textarea') input.textContent = value ?? '';
  if (options.tag === 'select') {
    for (const choice of options.choices) input.append(node('option', { value: typeof choice === 'string' ? choice : choice.value, text: typeof choice === 'string' ? choice : choice.label }));
    input.value = value;
  }
  const wrapper = node('label', { class: options.type === 'checkbox' ? 'field checkbox-field' : options.tag === 'textarea' ? 'field span-all' : 'field' });
  wrapper.append(node('span', { text: label }), input);
  return wrapper;
}

function message(text, error = false) {
  notice.hidden = false;
  notice.className = `notice${error ? ' error' : ''}`;
  notice.textContent = text;
  notice.scrollIntoView({ block: 'nearest' });
}

function confirmAction(question, accept) {
  const epoch = cloudWorkspace.read().epoch;
  const dialog = node('dialog', {}, [h2('Xác nhận'), p(question)]);
  dialog.setAttribute('data-workspace-confirm', '');
  const cancel = button('Hủy', () => dialog.close());
  const proceed = button('Tiếp tục', () => { dialog.close(); if (cloudWorkspace.read().epoch !== epoch) { message('Không gian đã đổi; hãy mở lại thao tác.', true); return; } accept(); }, 'danger');
  dialog.append(div('actions', cancel, proceed));
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  cancel.focus();
}

function accountMode() { return cloudWorkspace?.read().mode === 'account'; }
function readData() {
  const mode = cloudWorkspace?.read().mode;
  if (mode === 'account') return cloudWorkspace.getData();
  if (mode === 'sealed' || mode === 'opening') throw Error('Kho tài khoản đang khóa. Đăng nhập lại hoặc chọn rõ Chuyển về cục bộ trong Cài đặt.');
  return loadData(localStorage);
}
async function writeData(change) {
  const epoch = cloudWorkspace?.read().epoch;
  const next = accountMode() ? await cloudWorkspace.write(change, data) : await updateData(localStorage, navigator.locks, candidate => {
    if (cloudWorkspace?.read().mode !== 'local' || cloudWorkspace?.read().epoch !== epoch) throw Error('Không gian dữ liệu đã đổi.');
    change(candidate);
  });
  if (epoch !== cloudWorkspace?.read().epoch) throw Error('Thao tác thuộc không gian cũ.');
  if (accountMode()) channel?.postMessage({ uid: cloudWorkspace.read().uid, projectId: cloudWorkspace.read().projectId, environment:cloudWorkspace.read().environment });
  if (accountMode()) queueMicrotask(syncForeground);
  return next;
}
function assertWorkspaceEpoch(epoch) {
  if (epoch !== cloudWorkspace.read().epoch) throw Error('Thao tác thuộc không gian cũ.');
}
async function writePlanningData(change) {
  const epoch = cloudWorkspace.read().epoch;
  const next = await writeData(change);
  assertWorkspaceEpoch(epoch);
  data = next;
  return next;
}
async function readWorkspacePhotos() {
  if (cloudWorkspace?.read().mode !== 'local') throw Error('Ảnh tài khoản chưa hỗ trợ trong Batch 2. Kho ảnh cục bộ được giữ riêng.');
  return listPhotoMetadata();
}
function localWorkspaceGuard() {
  const epoch = cloudWorkspace.read().epoch;
  return () => { if (cloudWorkspace.read().mode !== 'local' || cloudWorkspace.read().epoch !== epoch) throw Error('Thao tác thuộc không gian cũ.'); };
}

const drafts = createDraftStore({ getData: () => data, write: writePlanningData });
const sessionStore = createSessionStore({ getData: () => data, write: change => writeData(change), acceptData: next => data = next, commitPlanning: (kind, change) => drafts.commit(kind, change) });
const cloudAuth = createCloudAuth({ adapter: createSupabaseAuthAdapter({ config: CLOUD_AUTH_CONFIG }), getPendingWork: () => {
  const forms = sourceFormValues();
  const unsaved = JSON.stringify(forms) !== JSON.stringify(sourceFormBaseline);
  const draftState = drafts.status().state, sessionState = sessionStore.status().state;
  const hasPlanningDraft = Boolean(data?.planningDraft?.builder || data?.planningDraft?.planner);
  const accountState=cloudWorkspace?.read();
  if (!unsaved && !data?.draft && !hasPlanningDraft && !accountState?.outboxCount && !accountState?.conflicts.length && !['saving', 'error'].includes(draftState) && !['saving', 'error'].includes(sessionState)) return null;
  return JSON.stringify({ forms: unsaved ? forms : null, draft: data?.draft, planningDraft: data?.planningDraft, draftState, sessionState,accountState });
} });
let cloudWorkspace = createCloudWorkspace({ auth: cloudAuth, hasUnsaved: () => JSON.stringify(sourceFormValues()) !== JSON.stringify(sourceFormBaseline) });
const cloudAuthUI = createCloudAuthUI({ auth: cloudAuth, helpers: { node, button, field, panel, div, p, h2 }, workspaceAvailable:true });
const cloudWorkspaceUI = createCloudWorkspaceUI({workspace:{...cloudWorkspace,
  async selectLive(recordId){
    if(JSON.stringify(sourceFormValues())!==JSON.stringify(sourceFormBaseline)){message('Có phần nhập chưa lưu; lưu hoặc hủy trước khi chọn buổi.',true);return{applied:false};}
    const epoch=cloudWorkspace.read().epoch,next=await cloudWorkspace.selectLive(recordId);
    assertWorkspaceEpoch(epoch);data=next;drafts.reset();sessionStore.reset();render();return{applied:true};
  },
  async refresh(confirmation){
    const epoch=cloudWorkspace.read().epoch,result=await cloudWorkspace.reviewLatest(confirmation);
    assertWorkspaceEpoch(epoch);
    if(result.applied){data=result.data;drafts.reset();sessionStore.reset();render();}return result;
  }
},auth:cloudAuth,helpers:{node,button,field,panel,div,p,h2},loadAnonymous:()=>{const raw=localStorage.getItem('vshape-tracker');return raw?JSON.parse(raw):emptyData();},listAnonymousPhotoMetadata:listPhotoMetadata});
let lastWorkspaceIdentity='local', accountBaseline=null;
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('tracker-sync-notices') : null;
function resetWorkspaceView() {
  document.querySelectorAll('[data-workspace-confirm]').forEach(dialog => dialog.close());
  photoUrls.forEach(url => URL.revokeObjectURL(url)); photoUrls = [];
  for (const url of [backupUrl, photoBackupUrl, restoreSafetyUrl]) if (url) URL.revokeObjectURL(url);
  backupUrl = photoBackupUrl = restoreSafetyUrl = null;
  restorePreview = photoRestorePreview = null;
  editingFood = editingEntry = editingCheckin = editingCardio = editingKnee = editingPhoto = editingSavedMeal = editingRecipe = null;
  lifeSourceContext = daySourceContext = lifeReturnContext = null;
  sourceFormBaseline = []; sourceNavigationBaseline = null;
  restTimer = null; selectedExercise = '';
  nutritionSubView = 'daily'; journalSection = 'entry'; journalReturnToResults = false;
  journalDate = localDate(); progressSubView = 'overview';
  foodDateSelection = { mode: 'today', date: localDate() };
  backupState.data = 'Chưa chuẩn bị file dữ liệu.'; backupState.photos = 'Chưa chuẩn bị file ảnh.';
  // Load the new scope BEFORE resetting stores whose baselines use getData().
  try { data = readData(); } catch { data = emptyData(); }
  drafts.reset(); sessionStore.reset(); sessionUI.reset(); gymBuilder.reset(); plannerView.reset();
  nutritionBatch.reset(); cookbook.reset(); journalRetrieval.reset(); myDay.setDate(localDate());
  main.replaceChildren(); view = 'settings'; updateNavigation(); render();
}
cloudWorkspace.subscribe(state=>{
  const identity=JSON.stringify([state.mode,state.uid,state.environment,state.projectId]);
  const labels={'local-only':'Chỉ trên thiết bị',syncing:'Đang đồng bộ',pending:'Chờ đồng bộ',synced:'Đã đồng bộ',conflict:'Có xung đột',offline:'Mất kết nối','needs-login':'Cần đăng nhập lại',auth:'Cần đăng nhập lại',failed:'Đồng bộ thất bại',error:'Đồng bộ thất bại',paused:'Đã tạm dừng'};
  document.querySelector('.local-badge').textContent=labels[state.syncStatus]||'Chờ đồng bộ';
  if(identity!==lastWorkspaceIdentity){lastWorkspaceIdentity=identity;accountBaseline=null;resetWorkspaceView();}
  else if(state.mode==='account'){const latest=cloudWorkspace.getData();if(accountBaseline!==JSON.stringify(latest)&&accountBaseline!==null)message('Dữ liệu tài khoản đã đổi. Phần nhập trên màn hình được giữ; chọn Tải lại dữ liệu mới nhất để review.');accountBaseline=JSON.stringify(latest);}
});
channel?.addEventListener('message',event=>{const state=cloudWorkspace.read(),scope=event.data;if(state.mode==='account'&&scope?.uid===state.uid&&scope?.projectId===state.projectId&&scope?.environment===state.environment){void cloudWorkspace.refresh(false).then(()=>message('Tab khác đã lưu dữ liệu tài khoản. Mở lại màn hình để xem bản mới; phần nhập hiện tại được giữ.')).catch(()=>{});}});
function syncForeground(){if(accountMode()&&!cloudWorkspace.read().cached&&document.visibilityState!=='hidden')void cloudWorkspace.sync().catch(()=>{});}
window.addEventListener('online',syncForeground);window.addEventListener('focus',syncForeground);document.addEventListener('visibilitychange',syncForeground);
setInterval(syncForeground,60000);
window.addEventListener('beforeunload', event => {
  if (['saving', 'error'].includes(drafts.status().state) || ['saving', 'error'].includes(sessionStore.status().state)) { event.preventDefault(); event.returnValue = ''; }
});
function draftStatus() {
  const status = p('', 'hint'); status.setAttribute('role', 'status');
  let connected = false;
  const unsubscribe = drafts.subscribe(value => {
    if (status.isConnected) connected = true;
    else if (connected) { unsubscribe(); return; }
    status.textContent = value.state === 'saving' ? 'Đang lưu bản nháp…' : value.state === 'saved' ? `Bản nháp đã lưu${value.savedAt ? ` lúc ${new Date(value.savedAt).toLocaleString('vi-VN')}` : ' / chuyển thành dữ liệu đã lưu'}.` : value.state === 'error' ? `CHƯA LƯU: ${value.message} Giữ màn hình và thử lưu lại; có thể mất phần mới nhập nếu đóng ngay.` : 'Bản nháp tự lưu khi bạn thay đổi nội dung.';
    status.classList.toggle('error', value.state === 'error');
  });
  queueMicrotask(() => { connected = status.isConnected; });
  return status;
}
function recoveryCard(kind, resume, afterDiscard) {
  let saved, error;
  try { saved = drafts.recover(kind); } catch (problem) { error = problem.message; }
  if (!saved && !error) return false;
  const box = panel(h2(kind === 'builder' ? 'Khôi phục bản nháp tạo buổi' : 'Khôi phục bản nháp planner'),
    p(error || `Có phần đang soạn, lưu lúc ${new Date(saved.savedAt).toLocaleString('vi-VN')}. Tiếp tục để xem/chỉnh; chưa bắt đầu hoặc lưu kế hoạch.`, error ? 'notice error' : 'hint'));
  if (saved) box.append(button('Tiếp tục bản nháp', () => resume(saved), 'primary'));
  if (error) {
    const blob = new Blob([JSON.stringify(data.planningDraft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); photoUrls.push(url);
    box.append(node('a', { href: url, download: 'tracker-corrupt-draft.json', text: 'Giữ bản sao bản nháp lỗi', class: 'secondary' }));
  }
  box.append(button('Bỏ bản nháp này', () => confirmAction('Bỏ bản nháp đang soạn này? Kế hoạch và lịch sử đã lưu vẫn còn.', async () => {
    try { await drafts.discard(kind); afterDiscard(); } catch (problem) { message(problem.message, true); }
  }), 'danger'));
  main.append(box); return true;
}
const gymBuilder = createGymBuilder({ main, getData: () => data, mutate, render, show, startWorkout: startCustomWorkout, drafts, draftStatus, recoveryCard,
  helpers: { node, button, field, panel, div, p, h2, h3, id, message, confirmAction } });
const plannerView = createPlannerUI({ main, getData: () => data, helpers: { node, button, field, panel, div, p, h2, h3, id, message, confirmAction }, drafts, draftStatus, recoveryCard,
  checkChoices: gymBuilder.checkChoices, render, useDraft: day => gymBuilder.setOneOff(day, () => { plannerView.reset(); show('builder'); }) });
const localNutritionPhoto = createNutritionPhotos({ helpers: { node, button, div, p, id, message, confirmAction }, render,
  captureGuard: localWorkspaceGuard,
  registerUrl: url => photoUrls.push(url), ownerExists: (type, ownerId) => {
    if(cloudWorkspace.read().mode!=='local')return false;
    const latest = readData(); return (type === 'food' ? latest.foods : latest.recipes).some(item => item.id === ownerId);
  } });
const nutritionPhoto=(...args)=>accountMode()?p('Ảnh tài khoản chưa hỗ trợ trong Batch 2.','hint'):localNutritionPhoto(...args);

const sessionUI = createSessionUI({ main, getData: () => data, getLatest: () => readData(), store: sessionStore, action: sessionAction,
  render, show, openWorkout, nextWorkoutInfo, mutate,
  restPanel: () => restTimer ? restTimerPanel() : null,
  clearRest: () => { restTimer = null; },
  startRest: (name, rest) => { const duration = restSeconds(rest); if (!duration) return; restTimer = { exercise: name, planRest: rest, duration, remaining: duration, endAt: Date.now() + duration * 1000, running: true }; render(); },
  registerUrl: url => photoUrls.push(url), helpers: { node, button, panel, div, p, h2, h3, field, fmt, confirmAction, message } });
async function sessionAction(operation, success = 'Đã lưu buổi.', { renderAfter = true } = {}) {
  const epoch = cloudWorkspace.read().epoch;
  try { await operation(); assertWorkspaceEpoch(epoch); sourceFormBaseline = sourceFormValues(); if (renderAfter) render(); message(success); return true; }
  catch (error) { message(error.message || 'Không thể lưu buổi.', true); return false; }
}

const myDay = createMyDayUI({ main, getData: () => data, render, openSource: openDaySource,
  readMetadata:readWorkspacePhotos,
  registerUrl: url => photoUrls.push(url), helpers: { node, button, panel, div, p, h2, h3, field, fmt } });
const nutritionBatch = createNutritionBatchUI({ main, getData:()=>data, getLatest:()=>readData(),
  write:change=>writeData(change), acceptData:next=>data=next, render,
  onSaved:(date,count)=>{foodDateSelection={mode:'selected',date};nutritionSubView='daily';render();message(`Đã thêm ${count} món vào ${date}.`);const launch=main.querySelector('[data-batch-launch]');launch?.focus();launch?.scrollIntoView({block:'center'});},
  helpers:{node,button,field,panel,div,p,h2,h3,fmt,id} });
const cookbook = createCookbookUI({main,getData:()=>data,getLatest:()=>readData(),
  write:change=>writeData(change),acceptData:next=>data=next,render,
  onDuplicateStart:()=>editingRecipe=null,clearPhotoUrls:()=>{photoUrls.forEach(url=>URL.revokeObjectURL(url));photoUrls=[];},
  helpers:{node,button,field,panel,div,p,h2,h3,fmt,id,message}});
const journalRetrieval = createJournalRetrievalUI({ main, getEntries: () => data.journalEntries,
  openEntry: entry => { journalDate = entry.date; journalSection = 'entry'; journalReturnToResults = true; show('journal'); },
  helpers: { node, button, panel, div, p, h2, h3, field } });
const lifeReview = createLifeReviewUI({ main, readData: () => readLifeData(() => readData()),
  readMetadata:readWorkspacePhotos,
  openSource: openLifeSource, openDay: (date, context) => openLifeSource({ kind: 'day', date }, context),
  helpers: { node, button, panel, div, p, h2, h3, field, fmt } });
const monthMemories = createMonthMemoriesUI({ main, readData: () => readLifeData(() => readData()),
  readMetadata:readWorkspacePhotos,
  openSource: openLifeSource, openDay: (date, context) => openLifeSource({ kind: 'day', date }, context),
  helpers: { node, button, panel, div, p, h2, h3, field, fmt } });

function sourceFormValues() {
  return [...main.querySelectorAll('form')].filter(form => !form.closest('[data-cloud-auth]')).map(form => [...form.querySelectorAll('input,textarea,select')]
    .map(input => [input.name, input.value, input.checked, input.validity?.badInput]).flat());
}
function guardLifeSource() {
  if (!lifeSourceContext || JSON.stringify(sourceFormBaseline) === JSON.stringify(sourceFormValues())) return true;
  message('Có phần nhập chưa lưu. Lưu hoặc đưa các ô về giá trị ban đầu trước khi quay lại Life Review.', true); return false;
}
async function openLifeSource(ref, context) {
  if (!guardLifeSource()) return;
  const generation = ++lifeSourceGeneration;
  const sourceControl = main.querySelector(context?.mode === 'month' ? '[name=monthMemoriesMonth]' : '[name=lifeReviewDate]');
  let latest, photos = [];
  try {
    if (ref.kind !== 'photo') latest = readData();
    else photos = await readWorkspacePhotos();
    if (generation !== lifeSourceGeneration) return;
    if (sourceControl && !sourceControl.isConnected) return;
    if (context?.weekAnchor && lifeReview.getContext().weekAnchor !== context.weekAnchor) return;
    if (context?.monthAnchor && monthMemories.getContext().monthAnchor !== context.monthAnchor) return;
    const resolved = resolveLifeSource(latest, photos, ref);
    lifeReturnContext = context; lifeSourceContext = { ref: structuredClone(ref), metadata: resolved.record };
    daySourceContext = null;
    if (latest) data = latest;
    if (ref.kind === 'photo') { show('life-photo'); return; }
    if (ref.kind === 'day') { myDay.setDate(ref.date); show('my-day', latest); return; }
    if (ref.kind === 'journal') { journalDate = ref.date; journalSection = 'entry'; journalReturnToResults = false; show('journal', latest); }
    else if (ref.kind === 'nutrition') { foodDateSelection = { mode: 'selected', date: ref.date }; nutritionSubView = 'daily'; editingEntry = null; show('nutrition', latest); }
    else if (ref.kind === 'workout' || ref.kind === 'set') show('history', latest);
    else if (ref.kind === 'cardio' || ref.kind === 'knee') { editingCardio = ref.kind === 'cardio' ? ref.id : null; editingKnee = ref.kind === 'knee' ? ref.id : null; show('gym-logs', latest); }
    else if (ref.kind === 'checkin') { progressSubView = 'checkins'; editingCheckin = ref.id; show('checkins', latest); }
  } catch (error) { message(error.message || 'Chưa đọc được nguồn.', true); }
}
function returnLifeReview() {
  if (!guardLifeSource() || (view === 'workout' && !sessionUI.guardUnsaved())) return;
  const context = lifeReturnContext;
  lifeSourceContext = null; lifeReturnContext = null; daySourceContext = null;
  progressSubView = context?.mode === 'month' ? 'monthly' : 'weekly';
  (context?.mode === 'month' ? monthMemories : lifeReview).returnTo(context); show('checkins');
}
function lifePhotoSourceView() {
  const item = lifeSourceContext?.metadata;
  main.append(panel(h2('Bản ghi ảnh'), p(`${item?.date} · ID ${item?.id}`, 'summary'),
    p(`Loại: ${item?.category || 'Chưa ghi'} · Góc: ${item?.pose || 'Chưa ghi'}`, 'hint'), p(item?.note || 'Chưa có ghi chú'),
    p('Đây là metadata của ảnh được chọn. Tuần đã ghi không tải ảnh gốc hoặc thư viện ảnh.', 'hint')));
}
function openDaySource(kind, date, recordId) {
  daySourceContext = { kind, date };
  if (kind === 'journal' || kind === 'photos') {
    journalReturnToResults = false;
    journalDate = date; journalSection = kind === 'photos' ? 'photos' : 'entry'; editingPhoto = null; photoFilter = 'all'; show('journal');
  } else if (kind === 'nutrition') {
    foodDateSelection = { mode: 'selected', date }; nutritionSubView = 'daily'; editingEntry = null; show('nutrition');
  } else if (kind === 'gym') show('history');
  else if (kind === 'cardio' || kind === 'knee') {
    editingCardio = kind === 'cardio' ? recordId : null; editingKnee = kind === 'knee' ? recordId : null; show('gym-logs');
  } else if (kind === 'checkin') {
    progressSubView = 'checkins'; editingCheckin = recordId; show('checkins');
  }
}

async function mutate(change, success = 'Đã lưu.') {
  const epoch = cloudWorkspace.read().epoch;
  try {
    const next = await writeData(change);
    assertWorkspaceEpoch(epoch);
    data = next;
    sourceFormBaseline = sourceFormValues();
    render();
    message(success);
    return true;
  } catch (error) { message(error.message || 'Không thể lưu dữ liệu.', true); return false; }
}

function show(next, verifiedSnapshot = null) {
  if (!guardLifeSource()) return;
  if (view === 'workout' && !sessionUI.guardUnsaved()) return;
  if (view === 'workout') sessionUI.clearReview();
  try { data = verifiedSnapshot ?? readData(); }
  catch (error) {
    if (!(next === 'life-photo' || next === 'checkins')) { message(error.message, true); return; }
    if (next === 'checkins' && !['weekly','monthly'].includes(progressSubView)) progressSubView = 'weekly';
  }
  lifeReview.invalidate(); monthMemories.invalidate(); ++lifeSourceGeneration;
  sessionStore.reset();
  if (next === 'dashboard' || next === 'my-day') daySourceContext = null;
  if (!['history','journal','nutrition','gym-logs','checkins','my-day','life-photo','workout'].includes(next)) { lifeSourceContext = null; lifeReturnContext = null; }
  view = next;
  notice.hidden = true;
  updateNavigation();
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
  focusLifeSource();
}
tabs.forEach(tab => tab.addEventListener('click', () => show(tab.getAttribute('data-view'))));
window.addEventListener('storage', event => {
  if (event.key !== 'vshape-tracker' || cloudWorkspace.read().mode !== 'local') return;
  try { readData(); message('Dữ liệu đã đổi ở tab khác. Phần đang nhập được giữ; mở lại mục hiện tại để xem và review bản mới nhất.'); }
  catch (error) { message(error.message, true); }
});
function refreshTodayDiary() {
  if (view !== 'nutrition' || foodDateSelection.mode !== 'today') return;
  const shown = main.querySelector('input[name=date]');
  if (shown && shown.value !== localDate()) render();
}
window.addEventListener('focus', refreshTodayDiary);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshTodayDiary(); });

function updateNavigation() {
  const group = navigationGroup(view);
  const titles = { today: 'Hôm nay', training: 'Gym', food: 'Dinh dưỡng', journal: 'Nhật ký & Ảnh', progress: 'Tiến độ', settings: 'Cài đặt & sao lưu' };
  viewTitle.textContent = view === 'my-day' ? 'Xem ngày' : titles[group];
  trainingNav.hidden = group !== 'training';
  tabs.forEach(tab => {
    const active = tab.dataset.group ? tab.dataset.group === group : tab.dataset.subview === view;
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}

function render() {
  if (!guardLifeSource()) {
    if (sourceNavigationBaseline) ({ editingFood, editingEntry, editingCheckin, editingCardio, editingKnee,
      progressSubView, nutritionSubView, journalDate, journalSection, journalReturnToResults, foodDateSelection } = sourceNavigationBaseline);
    return;
  }
  lifeReview.invalidate(); monthMemories.invalidate(); ++lifeSourceGeneration;
  photoUrls.forEach(url => URL.revokeObjectURL(url));
  photoUrls = [];
  main.replaceChildren();
  if(['sealed','opening'].includes(cloudWorkspace.read().mode)){main.append(cloudAuthUI.mount(),cloudWorkspaceUI.mount(),p('Không gian tài khoản đang khóa; phần đã lưu và outbox vẫn được giữ.','hint'));return;}
  if (lifeSourceContext) main.append(div('my-day-return', button(lifeReturnContext?.mode === 'month' ? '← Quay lại Ký ức tháng' : '← Quay lại Tuần đã ghi', returnLifeReview)));
  if (daySourceContext) main.append(div('my-day-return', button(`← Quay lại Xem ngày · ${daySourceContext.date}`, () => show('my-day'))));
  ({ dashboard: dashboardView, 'my-day': myDay.renderView, program: programView, 'original-program': originalProgramView, 'exercise-library': gymBuilder.libraryView, plans: gymBuilder.plansView, builder: gymBuilder.oneOffView, planner: plannerView, workout: workoutView, history: historyView, 'gym-logs': gymLogsView, nutrition: nutritionView, journal: journalView, checkins: checkinsView, settings: settingsView, 'life-photo': lifePhotoSourceView })[view]();
  sourceFormBaseline = sourceFormValues();
  sourceNavigationBaseline = { editingFood, editingEntry, editingCheckin, editingCardio, editingKnee,
    progressSubView, nutritionSubView, journalDate, journalSection, journalReturnToResults, foodDateSelection };
  focusLifeSource();
}
function focusLifeSource() {
  if (lifeSourceContext) {
    const ref = lifeSourceContext.ref;
    const focus = [...main.querySelectorAll('[data-source-id]')].find(item => item.dataset.sourceId === ref.id
      && (item.dataset.sourceKind ?? ref.kind) === ref.kind
      && (ref.kind !== 'set' || item.dataset.sessionId === ref.sessionId))
      || (['cardio','knee','checkin','journal'].includes(ref.kind) ? main.querySelector('form') : null);
    if (focus) { focus.setAttribute('tabindex','-1'); focus.focus(); focus.scrollIntoView({block:'center'}); }
  }
}

function latestCheckin(key) { return [...data.checkins].filter(item => item[key] !== null).sort((a, b) => b.date.localeCompare(a.date))[0]; }
function currentWeekCount() { const start = weekStart(); return data.sessions.filter(item => item.date >= start && item.date <= localDate()).length; }

function dashboardView() {
  for (const [kind, label, target] of [['builder', 'Tạo buổi', 'builder'], ['planner', 'Planner', 'planner']]) {
    try { if (drafts.recover(kind)) main.append(panel(h2(`${label}: có bản nháp chưa hoàn tất`), button('Mở bản nháp', () => show(target)))); }
    catch { main.append(panel(p(`${label}: bản nháp cần phục hồi.`, 'notice'), button('Kiểm tra bản nháp', () => show(target)))); }
  }
  const today = nextWorkoutInfo();
  const weight = latestCheckin('weight');
  const waist = latestCheckin('waist');
  const latest = [...data.checkins].sort((a, b) => b.date.localeCompare(a.date))[0];
  const totals = dailyTotals(data.entries, localDate());
  const intro = panel(p(today.planName, 'eyebrow'), h2(today.title), p(today.detail, 'summary'));
  intro.classList.add('hero-panel');
  intro.append(button(data.draft ? 'Tiếp tục buổi đang tập →' : 'Bắt đầu buổi kế tiếp →', today.begin, 'primary'));
  const nutrition = panel(div('row', h2('Dinh dưỡng hôm nay'), button('Mở nhật ký', () => show('nutrition'))), div('stat-pair',
    div('', node('strong', { text: `${fmt(totals.calories)} / ${fmt(data.settings.calories)}` }), node('small', { text: 'kcal đã ghi / mục tiêu' })),
    div('', node('strong', { text: `${fmt(totals.protein)} / ${fmt(data.settings.protein)}` }), node('small', { text: 'g protein đã ghi / mục tiêu' }))));
  if (!data.entries.some(item => item.date === localDate())) nutrition.append(p('Chưa ghi món ăn nào hôm nay.', 'hint'));
  const week = panel(p('TUẦN ORIGINAL PLAN', 'eyebrow'), h2(`${data.settings.week} / 12`), p(weekGuidance(data.settings.week), 'hint'), div('stat-pair',
    div('', node('strong', { text: data.activePlanId === null ? `${currentWeekCount()} / 4` : String(currentWeekCount()) }), node('small', { text: 'buổi tuần này' })),
    div('', node('strong', { text: weight ? `${fmt(weight.weight)} kg` : '—' }), node('small', { text: 'cân gần nhất' }))));
  const checkin = panel(h2('Check-in gần nhất'), latest ? p(`${latest.date}${latest.weight !== null ? ` · ${fmt(latest.weight)} kg` : ''}${latest.waist !== null ? ` · ${fmt(latest.waist)} cm eo` : ''}`, 'summary') : p('Chưa có cân nặng hoặc số đo eo. Ghi lần đầu để thấy thay đổi.', 'hint'), button('Ghi check-in', () => { progressSubView = 'checkins'; show('checkins'); }));
  main.append(div('dashboard-layout', div('stack', intro, nutrition), div('stack', week, checkin)), h2('Chọn việc cần làm'), div('quick-links',
    quickLink('Xem ngày', 'Xem các bản ghi theo ngày', () => show('my-day')),
    quickLink('Gym', 'Bài tập và buổi đang tập', () => show('program')),
    quickLink('Dinh dưỡng', 'Nhật ký và món ăn', () => show('nutrition')),
    quickLink('Nhật ký & Ảnh', 'Ghi lại một ngày', () => show('journal')),
    quickLink('Tiến độ', 'Xem lịch sử thật', () => show('checkins'))));
}
function stat(label, value) { return div('stat', node('small', { text: label }), node('strong', { text: value })); }
function quickLink(label, detail, action) {
  const link = button(label, action);
  link.append(node('small', { text: detail }));
  return link;
}

function nextWorkoutInfo() {
  if (data.draft) return { title: sessionTitle(data.draft), planName: data.draft.workoutSnapshot?.planName || 'Original Plan · 12 tuần', detail: runtimeView(data.draft).ambiguous ? 'Buổi cũ cần kiểm tra ownership · dữ liệu vẫn được giữ' : `${runtimeView(data.draft).slots.filter(slot => slot.status === 'active').length} bài · bản nháp đã lưu`, begin: () => show('workout') };
  const plan = data.plans.find(item => item.id === data.activePlanId);
  if (plan) {
    const day = nextPlanDay({ ...plan, days: plan.days.filter(item => item.exercises.length) }, data.sessions);
    return day ? { title: day.name, planName: plan.name, detail: `${day.exercises.length} bài · tiếp tục theo thứ tự buổi trong kế hoạch`, begin: () => startCustomWorkout(day, plan) } :
      { title: 'Kế hoạch chưa có buổi có bài', planName: plan.name, detail: 'Thêm bài trong Kế hoạch của tôi để bắt đầu.', begin: () => show('plans') };
  }
  const key = nextWorkout(data.sessions, null);
  return { title: `Buổi ${key} · ${PROGRAM[key].title}`, planName: 'Original Plan · 12 tuần', detail: `${PROGRAM[key].exercises.length} bài · tiếp tục thứ tự A → B → C → D`, begin: () => openWorkout(key) };
}

function programView() {
  const next = nextWorkoutInfo();
  main.append(panel(p(next.planName, 'eyebrow'), h2(next.title), p(next.detail, 'summary'), div('actions', button(data.draft ? 'Tiếp tục buổi đang tập' : 'Bắt đầu buổi kế tiếp', next.begin, 'primary'), button('Tạo buổi riêng hôm nay', () => show('builder')), button('Trợ lý lên buổi', () => show('planner')), button('Kế hoạch của tôi', () => show('plans')), button('Thư viện bài tập', () => show('exercise-library')))));
  const active = data.plans.find(item => item.id === data.activePlanId);
  if (!active) { originalProgramView(); return; }
  const box = panel(h2(`Các buổi · ${active.name}`));
  for (const day of active.days) box.append(div('list-card', h3(day.name), p(`${day.exercises.length} bài · ${day.exercises.map(item => item.name).join(' · ')}`, 'hint'), button('Mở buổi này', () => startCustomWorkout(day, active), 'primary')));
  box.append(button('Xem Original Plan', () => show('original-program'))); main.append(box);
}

function originalProgramView() {
  const days = div('program-days');
  for (const [key, workout] of Object.entries(PROGRAM)) {
    const choice = node('button', { type: 'button', 'aria-label': `Buổi ${key}: ${workout.day} · ${workout.title}`, 'aria-pressed': key === selectedProgram ? 'true' : 'false', onClick: () => { selectedProgram = key; render(); } }, [node('strong', { text: key }), node('span', { text: `${workout.day} · ${workout.title.split(' · ')[0]}` })]);
    days.append(choice);
  }
  const chosen = programDay(selectedProgram, data.settings.week);
  const details = panel(div('row', div('', p(`BUỔI ${selectedProgram}`, 'eyebrow'), h2(chosen.title)), button('Bắt đầu buổi →', () => openWorkout(selectedProgram), 'primary')), p(`${chosen.day} · Tuần ${data.settings.week}`, 'hint'));
  chosen.exercises.forEach((item, index) => details.append(div('program-line', node('strong', { text: `${index + 1}. ${item.name}` }), node('span', { text: `${item.sets} × ${item.reps} · nghỉ ${item.rest} · RIR ${item.rir}` }), item.note ? p(item.note, 'hint') : document.createTextNode(''), data.exerciseNotes[`${selectedProgram}:${index}`] ? p(`Ghi chú riêng: ${data.exerciseNotes[`${selectedProgram}:${index}`]}`, 'hint') : document.createTextNode(''))));
  const guidance = panel(h2('Nguyên tắc buổi tập'), p(weekGuidance(data.settings.week), 'warning'), p('Nếu lỡ buổi, tiếp tục thứ tự A → B → C → D; không nhồi hai buổi trong một ngày.', 'hint'), p('Ứng dụng chỉ ghi chép, không tự quyết định tăng hoặc giảm tải.', 'hint'));
  if (selectedProgram === 'B' || selectedProgram === 'D') guidance.append(p('Gối: nếu đau nhói, kẹt, lỏng/khuỵu khi tập, dừng bài. Theo dõi sưng hoặc đau tăng sau buổi và sáng hôm sau. Xem MASTER_PLAN.md.', 'warning'));
  guidance.append(p('Cardio: bắt đầu 2 lần/tuần, 15–20 phút đi bộ phẳng hoặc xe đạp tại chỗ nếu gối dung nạp; chi tiết trong MASTER_PLAN.md.', 'hint'));
  main.append(days, div('program-detail', details, guidance));
}

async function startCustomWorkout(day, plan = null, planningKind = null, afterSuccess = () => {}) {
  let snapshot;
  try { snapshot = snapshotWorkout(day, plan); } catch (error) { message(error.message, true); return; }
  if (!planningKind && data.draft?.workoutSnapshot?.dayId === day.id && data.draft.workoutSnapshot.planId === (plan?.id ?? null)) { show('workout'); return; }
  const expected = data.draft ? structuredClone(data.draft) : null;
  const start = async () => {
    if (await sessionAction(() => sessionStore.start({ workout: 'CUSTOM', workoutSnapshot: snapshot, date: localDate() }, expected, { plan, planningKind }), 'Đã mở buổi với snapshot riêng.')) {
      afterSuccess(); restTimer = null; sessionUI.reset(); show('workout');
    }
  };
  if (expected) confirmAction('Bắt đầu buổi này sẽ thay bản nháp đang có. Tiếp tục?', start); else start();
}
async function openWorkout(key) {
  if (data.draft?.workout === key) { show('workout'); return; }
  const expected = data.draft ? structuredClone(data.draft) : null;
  const start = async () => {
    if (await sessionAction(() => sessionStore.start({ workout: key, date: localDate() }, expected), `Đã mở buổi ${key}.`)) {
      restTimer = null; sessionUI.reset(); show('workout');
    }
  };
  if (expected) confirmAction('Đổi buổi sẽ thay bản nháp hiện tại. Tiếp tục?', start); else start();
}
const workoutView = () => sessionUI.workoutView();
const historyView = () => {
  const date = ['workout','set'].includes(lifeSourceContext?.ref.kind) ? lifeSourceContext.ref.date : daySourceContext?.kind === 'gym' ? daySourceContext.date : null;
  if (date) main.append(panel(p(`Lịch sử ngày ${date}`, 'hint'), button('Xem toàn bộ lịch sử tập', () => {
    if (daySourceContext) daySourceContext.kind = 'all-history';
    if (lifeSourceContext) lifeSourceContext.ref = { kind: 'all-history', date };
    render();
  })));
  sessionUI.historyView(date);
};

function restTimerPanel() {
  const timer = panel(h3('Đồng hồ nghỉ'), p(`${restTimer.exercise} · theo plan: ${restTimer.planRest}. Khoảng nghỉ dùng mức thấp làm mặc định.`, 'hint'));
  const display = node('strong', { class: 'timer-count', text: timerText() });
  timer.append(display, div('actions',
    button('Bắt đầu', () => { restTimer.remaining = restTimer.duration; restTimer.endAt = Date.now() + restTimer.duration * 1000; restTimer.running = true; updateTimerDisplay(); }),
    button('Tạm dừng', () => { if (restTimer.running) restTimer.remaining = Math.max(0, Math.ceil((restTimer.endAt - Date.now()) / 1000)); restTimer.running = false; updateTimerDisplay(); }),
    button('Tiếp tục', () => { if (!restTimer.running && restTimer.remaining > 0) { restTimer.endAt = Date.now() + restTimer.remaining * 1000; restTimer.running = true; updateTimerDisplay(); } }),
    button('Đặt lại', () => { restTimer.remaining = restTimer.duration; restTimer.running = false; updateTimerDisplay(); }),
    button('Bỏ qua', () => { if (sessionUI.guardUnsaved()) { restTimer = null; render(); } })));
  return timer;
}

function timerText() {
  if (!restTimer) return '';
  const seconds = restTimer.running ? Math.max(0, Math.ceil((restTimer.endAt - Date.now()) / 1000)) : restTimer.remaining;
  return seconds === 0 ? 'Nghỉ xong' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  if (!restTimer) return;
  if (restTimer.running && Date.now() >= restTimer.endAt) { restTimer.remaining = 0; restTimer.running = false; }
  const display = document.querySelector('.timer-count');
  if (display) display.textContent = timerText();
}
setInterval(updateTimerDisplay, 1000);

function gymLogsView() {
  main.append(panel(h2('Cardio & ghi nhận gối'), p('Chỉ ghi lại hoạt động và triệu chứng. Ứng dụng không chẩn đoán hoặc xác nhận gối an toàn để tăng tải.', 'hint')));
  const cardio = data.cardioEntries.find(item => item.id === editingCardio);
  const cardioBox = panel(h2('Cardio'));
  const cardioForm = node('form', { class: 'form-grid' }, [
    field('Ngày', 'date', cardio?.date || localDate(), { type: 'date', required: true }),
    field('Hoạt động', 'activity', cardio?.activity || '', { required: true }),
    field('Thời lượng (phút)', 'durationMinutes', cardio?.durationMinutes ?? '', { type: 'number', min: '1', step: 'any', required: true }),
    field('Quãng đường (km, tùy chọn)', 'distanceKm', cardio?.distanceKm ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Cường độ tự ghi (tùy chọn)', 'intensity', cardio?.intensity || ''),
    field('Ghi chú', 'notes', cardio?.notes || '', { tag: 'textarea' }),
    node('button', { type: 'submit', class: 'primary', text: cardio ? 'Lưu cardio' : 'Thêm cardio' })
  ]);
  if (cardio) cardioForm.append(button('Hủy sửa', () => { editingCardio = null; render(); }));
  if (cardio) cardioForm.dataset.sourceId = cardio.id;
  cardioForm.dataset.sourceKind = 'cardio';
  cardioForm.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(cardioForm));
    const saved = await mutate(next => {
      const record = { id: cardio?.id || id(), ...validateCardio(raw) };
      if (cardio) {
        const index = next.cardioEntries.findIndex(item => item.id === cardio.id);
        ensureUnchanged(next.cardioEntries[index], cardio);
        next.cardioEntries[index] = record;
      } else next.cardioEntries.push(record);
    }, 'Đã lưu cardio.');
    if (saved) { editingCardio = null; render(); }
  });
  cardioBox.append(cardioForm);
  if (!data.cardioEntries.length) cardioBox.append(p('Chưa ghi cardio.', 'empty'));
  for (const item of [...data.cardioEntries].sort((a, b) => b.date.localeCompare(a.date))) cardioBox.append(div('list-card',
    h3(`${item.date} · ${item.activity}`), p(`${fmt(item.durationMinutes)} phút${item.distanceKm !== null ? ` · ${fmt(item.distanceKm)} km` : ''}${item.intensity ? ` · ${item.intensity}` : ''}`, 'summary'),
    item.notes ? p(item.notes, 'hint') : document.createTextNode(''), div('actions',
      button('Sửa', () => { editingCardio = item.id; render(); }),
      button('Xóa', () => confirmAction(`Xóa cardio ngày ${item.date}?`, () => mutate(next => {
        ensureUnchanged(next.cardioEntries.find(entry => entry.id === item.id), item);
        next.cardioEntries = next.cardioEntries.filter(entry => entry.id !== item.id);
      }, 'Đã xóa cardio.')), 'danger'))));
  main.append(cardioBox);

  const knee = data.kneeEntries.find(item => item.id === editingKnee);
  const kneeBox = panel(h2('Ghi nhận gối'));
  const statusChoices = [{ value: 'unknown', label: 'Chưa ghi' }, { value: 'no', label: 'Không' }, { value: 'yes', label: 'Có' }];
  const kneeForm = node('form', { class: 'form-grid' }, [
    field('Ngày', 'date', knee?.date || localDate(), { type: 'date', required: true }),
    field('Thời điểm', 'moment', knee?.moment || 'after', { tag: 'select', choices: [
      { value: 'during', label: 'Trong buổi tập' }, { value: 'after', label: 'Sau buổi tập' }, { value: 'next-morning', label: 'Sáng hôm sau' }
    ] }),
    field('Đau (0–10, tùy chọn)', 'pain', knee?.pain ?? '', { type: 'number', min: '0', max: '10', step: '1' }),
    field('Sưng', 'swelling', knee?.swelling || 'unknown', { tag: 'select', choices: statusChoices }),
    field('Mất vững', 'instability', knee?.instability || 'unknown', { tag: 'select', choices: statusChoices }),
    field('Cứng', 'stiffness', knee?.stiffness || 'unknown', { tag: 'select', choices: statusChoices }),
    field('Ghi chú', 'notes', knee?.notes || '', { tag: 'textarea' }),
    node('button', { type: 'submit', class: 'primary', text: knee ? 'Lưu ghi nhận gối' : 'Thêm ghi nhận gối' })
  ]);
  if (knee) kneeForm.append(button('Hủy sửa', () => { editingKnee = null; render(); }));
  if (knee) kneeForm.dataset.sourceId = knee.id;
  kneeForm.dataset.sourceKind = 'knee';
  kneeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(kneeForm));
    const saved = await mutate(next => {
      const record = { id: knee?.id || id(), ...validateKnee(raw) };
      if (knee) {
        const index = next.kneeEntries.findIndex(item => item.id === knee.id);
        ensureUnchanged(next.kneeEntries[index], knee);
        next.kneeEntries[index] = record;
      } else next.kneeEntries.push(record);
    }, 'Đã lưu ghi nhận gối.');
    if (saved) { editingKnee = null; render(); }
  });
  kneeBox.append(kneeForm);
  if (!data.kneeEntries.length) kneeBox.append(p('Chưa có ghi nhận gối có cấu trúc.', 'empty'));
  const statusText = value => ({ yes: 'có', no: 'không', unknown: 'chưa ghi' })[value];
  const momentText = value => ({ during: 'Trong buổi tập', after: 'Sau buổi tập', 'next-morning': 'Sáng hôm sau' })[value];
  for (const item of [...data.kneeEntries].sort((a, b) => b.date.localeCompare(a.date))) kneeBox.append(div('list-card',
    h3(`${item.date} · ${momentText(item.moment)}`), p(`Đau: ${item.pain ?? 'chưa ghi'} · Sưng: ${statusText(item.swelling)} · Mất vững: ${statusText(item.instability)} · Cứng: ${statusText(item.stiffness)}`, 'summary'),
    item.notes ? p(item.notes, 'hint') : document.createTextNode(''), div('actions',
      button('Sửa', () => { editingKnee = item.id; render(); }),
      button('Xóa', () => confirmAction(`Xóa ghi nhận gối ngày ${item.date}?`, () => mutate(next => {
        ensureUnchanged(next.kneeEntries.find(entry => entry.id === item.id), item);
        next.kneeEntries = next.kneeEntries.filter(entry => entry.id !== item.id);
      }, 'Đã xóa ghi nhận gối.')), 'danger'))));
  main.append(kneeBox);
}

function nutritionView() {
  main.append(panel(h2('Dinh dưỡng'), p('Tự nhập thông tin từ nhãn hoặc nguồn bạn tin cậy. Ứng dụng không có dữ liệu macro mặc định.', 'hint')));
  const nav = div('subtabs', ...[
    ['daily', 'Nhật ký ngày'], ['foods', 'Thực phẩm'], ['saved', 'Bữa lưu sẵn'], ['recipes', 'Công thức'], ['summary', 'Tổng kết']
  ].map(([key, label]) => {
    const item = button(label, () => { nutritionSubView = key; render(); });
    item.setAttribute('aria-pressed', String(nutritionSubView === key));
    return item;
  }));
  main.append(nav);
  const foodDate = diaryDate(foodDateSelection);
  if (nutritionSubView === 'foods') { renderFoodLibrary(); return; }
  if (nutritionSubView === 'saved') { renderSavedMeals(foodDate); return; }
  if (nutritionSubView === 'recipes') { renderRecipes(foodDate); return; }
  if (nutritionSubView === 'summary') { renderNutritionSummary(); return; }
  const dateField = field('Ngày', 'date', foodDate, { type: 'date' });
  dateField.querySelector('input').addEventListener('change', event => {
    if (!validDate(event.target.value)) { message('Ngày không hợp lệ.', true); return; }
    foodDateSelection = { mode: event.target.value === localDate() ? 'today' : 'selected', date: event.target.value };
    render();
  });
  const totals = dailyTotals(data.entries, foodDate);
  const summary = panel(h2('Tổng trong ngày'), dateField, div('stats',
    stat('Calories', `${fmt(totals.calories)} / ${fmt(data.settings.calories)} kcal`),
    stat('Protein', `${fmt(totals.protein)} / ${fmt(data.settings.protein)} g`),
    stat('Carbs', `${fmt(totals.carbs)} g`), stat('Fat', `${fmt(totals.fat)} g`)));
  summary.append(p('Mục tiêu carbs: DATA NOT DEFINED YET · Chất béo theo plan khoảng 60–75 g/ngày.', 'hint'));
  summary.append(button('Về hôm nay', () => { foodDateSelection = { mode: 'today', date: localDate() }; render(); }));
  const yesterday = new Date(`${foodDate}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const sourceDate = localDate(yesterday);
  summary.append(button('Sao chép ngày hôm trước', () => confirmAction(`Sao chép các món ngày ${sourceDate} vào ${foodDate}? Món đang có sẽ được giữ nguyên.`, () => mutate(next => {
    next.entries.push(...copyDayEntries(next.entries, sourceDate, foodDate, id));
  }, 'Đã sao chép nhật ký ăn.'))));
  main.append(summary);
  nutritionBatch.render(foodDate);
  renderFoodEntries(foodDate);
}

function renderFoodLibrary() {
  const box = panel(h2('Thư viện món ăn'));
  const editing = data.foods.find(item => item.id === editingFood);
  const form = node('form', { class: 'form-grid' }, [
    field('Tên món', 'name', editing?.name || '', { required: true }),
    field('Khẩu phần (ví dụ 100 g)', 'serving', editing?.serving || '', { required: true }),
    field('Calories / khẩu phần', 'calories', editing?.calories ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Protein (g)', 'protein', editing?.protein ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Carbs (g)', 'carbs', editing?.carbs ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Fat (g)', 'fat', editing?.fat ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Ghi chú nguồn/nhãn', 'notes', editing?.notes || '')
  ]);
  form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu thay đổi món' : 'Thêm món' }));
  if (editing) form.append(button('Hủy sửa', () => { editingFood = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      const food = validateFood(raw);
      if (editing) {
        const index = next.foods.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.foods[index], editing);
        next.foods[index] = { ...editing, ...food };
      }
      else next.foods.push({ id: id(), ...food });
    }, editing ? 'Đã sửa món. Bữa cũ vẫn giữ macro đã ghi.' : 'Đã thêm món.');
    if (done) { editingFood = null; render(); }
  });
  box.append(form);
  const search = field('Tìm thực phẩm', 'foodSearch');
  const searchInput = search.querySelector('input');
  searchInput.type = 'search';
  const clear = button('Xóa tìm kiếm thực phẩm', () => { searchInput.value = ''; updateResults(); searchInput.focus(); });
  const results = div('food-results');
  const updateResults = () => {
    results.replaceChildren();
    const query = searchInput.value;
    const foods = searchFoods(data.foods, data.entries, query);
    clear.disabled = !query;
    if (!foods.length) results.append(p(query ? 'Không tìm thấy thực phẩm phù hợp.' : 'Chưa có món nào. Nhập macro từ nhãn thực phẩm để bắt đầu.', 'empty'));
    for (const food of foods) results.append(div('list-card', h3(food.name), nutritionPhoto('food', food.id, food.name), p(`${food.serving} · ${fmt(food.calories)} kcal · P ${fmt(food.protein)} · C ${fmt(food.carbs)} · F ${fmt(food.fat)}`, 'summary'), food.notes ? p(food.notes, 'hint') : document.createTextNode(''), div('actions', button('Sửa', () => { editingFood = food.id; render(); }), button('Xóa', () => {
      confirmAction(`Xóa món ${food.name} khỏi thư viện? Các bữa đã ghi giữ nguyên; ảnh còn trong Nhật ký & Ảnh để bạn tự quản lý.`, () => mutate(next => { ensureUnchanged(next.foods.find(item => item.id === food.id), food); next.foods = next.foods.filter(item => item.id !== food.id); }, 'Đã xóa món khỏi thư viện.'));
    }, 'danger'))));
  };
  searchInput.addEventListener('input', updateResults);
  box.append(search, div('actions', clear), results);
  updateResults();
  main.append(box);
}

function renderFoodEntries(foodDate) {
  const box = panel(h2('Nhật ký ăn trong ngày'));
  const editing = data.entries.find(item => item.id === editingEntry);
  if (data.foods.length || editing) {
    const form = node('form', { class: 'form-grid' }, [
      field('Bữa', 'meal', editing?.meal || 'Breakfast', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] }),
      field('Tìm món để ghi', 'foodSearch', '', { type: 'search' }),
      field('Món', 'foodId', editing?.foodId || data.foods[0]?.id || '', { tag: 'select', choices: [] }),
      field('Số khẩu phần', 'servings', editing?.servings ?? 1, { type: 'number', min: '0.01', step: 'any', required: true })
    ]);
    const select = form.querySelector('[name=foodId]');
    const search = form.querySelector('[name=foodSearch]');
    const searchHint = p('', 'hint');
    searchHint.setAttribute('role', 'status');
    const save = node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu thay đổi bữa' : 'Ghi bữa ăn' });
    const choices = [...data.foods];
    if (editing && !choices.some(food => food.id === editing.foodId)) choices.push({ ...editing.food, id: editing.foodId });
    const updateChoices = (preferred = select.value) => {
      const matches = searchFoods(choices, data.entries, search.value);
      select.replaceChildren(...matches.map(food => node('option', { value: food.id, text: `${food.name} · ${food.serving}${data.foods.some(item => item.id === food.id) ? '' : ' (bản ghi đã lưu)'}` })));
      select.value = matches.some(food => food.id === preferred) ? preferred : matches[0]?.id || '';
      select.disabled = save.disabled = !matches.length;
      searchHint.textContent = matches.length ? `${matches.length} món · ưu tiên món ghi gần đây.` : 'Không có món phù hợp. Xóa từ tìm kiếm để chọn lại.';
    };
    updateChoices(editing?.foodId);
    search.addEventListener('input', () => updateChoices());
    form.append(searchHint, save);
    if (editing) form.append(button('Hủy sửa', () => { editingEntry = null; render(); }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form));
      if (!select.value) { message('Chọn một món trước khi ghi bữa ăn.', true); return; }
      const done = await mutate(next => {
        const entry = validateEntry({ ...raw, date: diaryDate(foodDateSelection) });
        const current = editing ? next.entries.find(item => item.id === editing.id) : null;
        if (editing) ensureUnchanged(current, editing);
        const snapshot = foodSnapshotForEntry(current, raw.foodId, next.foods);
        const record = { id: editing?.id || id(), foodId: raw.foodId, food: snapshot, ...entry };
        if (editing) next.entries[next.entries.findIndex(item => item.id === editing.id)] = record;
        else next.entries.push(record);
      }, 'Đã lưu bữa ăn.');
      if (done) { editingEntry = null; render(); }
    });
    box.append(form);
  } else box.append(p('Tạo một món trong thư viện trước khi ghi bữa ăn.', 'empty'), button('Mở thư viện thực phẩm', () => { nutritionSubView = 'foods'; render(); }));
  const entries = data.entries.filter(item => item.date === foodDate);
  if (!entries.length) box.append(p('Chưa có bữa ăn cho ngày này.', 'empty'));
  for (const entry of entries) {
    const macros = dailyTotals([entry], entry.date);
    const card = div('list-card', h3(`${entry.meal} · ${entry.food.name}`), p(`${fmt(entry.servings)} × ${entry.food.serving} · ${fmt(macros.calories)} kcal · P ${fmt(macros.protein)} · C ${fmt(macros.carbs)} · F ${fmt(macros.fat)}`, 'summary'), div('actions', button('Sửa', () => { editingEntry = entry.id; render(); }), button('Xóa', () => confirmAction('Xóa bữa ăn này?', () => mutate(next => { next.entries = next.entries.filter(item => item.id !== entry.id); }, 'Đã xóa bữa ăn.')), 'danger')));
    card.dataset.sourceId = entry.id; card.dataset.sourceKind = 'nutrition'; box.append(card);
  }
  main.append(box);
}

function renderSavedMeals(foodDate) {
  const editing = data.savedMeals.find(item => item.id === editingSavedMeal);
  const box = panel(h2('Bữa ăn lưu sẵn'), p('Lưu các món đã ghi trong một bữa để dùng lại. Bữa đã ghi luôn giữ macro tại thời điểm thêm.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Tên bữa lưu sẵn', 'name', editing?.name || '', { required: true }),
    field('Lấy món từ ngày', 'date', foodDate, { type: 'date', required: true }),
    field('Bữa nguồn', 'meal', 'Breakfast', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] })
  ]);
  if (editing) form.append(field('Thay danh sách món bằng bữa nguồn (tùy chọn)', 'replaceItems', '', { type: 'checkbox' }));
  form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu thay đổi bữa mẫu' : 'Lưu bữa đang có' }));
  if (editing) form.append(button('Hủy sửa', () => { editingSavedMeal = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      if (!validDate(raw.date)) throw new Error('Ngày nguồn không hợp lệ.');
      const name = raw.name.trim();
      if (!name) throw new Error('Nhập tên bữa lưu sẵn.');
      if (editing) {
        const index = next.savedMeals.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.savedMeals[index], editing);
        next.savedMeals[index] = { ...editing, name, items: raw.replaceItems !== undefined ? savedMealFromEntries(name, next.entries, raw.date, raw.meal, id).items : editing.items };
      } else next.savedMeals.push(savedMealFromEntries(name, next.entries, raw.date, raw.meal, id));
    }, 'Đã lưu bữa ăn mẫu.');
    if (done) { editingSavedMeal = null; render(); }
  });
  box.append(form);
  if (!data.savedMeals.length) box.append(p('Chưa có bữa lưu sẵn. Ghi món trong Nhật ký ngày, rồi lưu bữa tại đây.', 'empty'));
  for (const template of data.savedMeals) {
    const card = div('list-card', h3(template.name), p(`${template.items.length} món · ${fmt(template.items.reduce((sum, item) => sum + item.food.calories * item.servings, 0))} kcal theo bản mẫu`, 'summary'));
    const list = node('ul', { class: 'history-list' });
    for (const item of template.items) list.append(node('li', { text: `${fmt(item.servings)} × ${item.food.name} · ${fmt(item.food.calories * item.servings)} kcal` }));
    const useForm = node('form', { class: 'form-grid' }, [
      field('Ngày cần ghi', 'date', foodDate, { type: 'date', required: true }),
      field('Bữa cần ghi', 'meal', 'Breakfast', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] }),
      node('button', { type: 'submit', class: 'primary', text: 'Ghi bữa mẫu' })
    ]);
    useForm.addEventListener('submit', async event => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(useForm));
      const done = await mutate(next => {
        if (!validDate(raw.date)) throw new Error('Ngày không hợp lệ.');
        const current = next.savedMeals.find(item => item.id === template.id);
        ensureUnchanged(current, template);
        next.entries.push(...useSavedMeal(current, raw.date, raw.meal, id));
      }, 'Đã ghi bữa mẫu vào nhật ký.');
      if (done) { foodDateSelection = { mode: raw.date === localDate() ? 'today' : 'selected', date: raw.date }; nutritionSubView = 'daily'; render(); }
    });
    card.append(list, useForm, div('actions', button('Sửa mẫu', () => { editingSavedMeal = template.id; render(); }),
      button('Xóa mẫu', () => confirmAction(`Xóa bữa mẫu ${template.name}? Nhật ký cũ vẫn giữ nguyên.`, () => mutate(next => {
        ensureUnchanged(next.savedMeals.find(item => item.id === template.id), template);
        next.savedMeals = next.savedMeals.filter(item => item.id !== template.id);
      }, 'Đã xóa bữa mẫu.')), 'danger')));
    box.append(card);
  }
  main.append(box);
}

function renderRecipes(foodDate) {
  if(cookbook.renderCooking())return;
  const editing = data.recipes.find(item => item.id === editingRecipe);
  const duplicate=cookbook.duplicateDraft(),values=duplicate?.raw??recipeFormValues(editing);
  const box = panel(h2(duplicate?'Duyệt bản sao công thức':'Công thức'), p(duplicate?'Bản sao chưa lưu. Chỉnh các ô rồi Lưu bản sao; ảnh nguồn không được copy. Reload sẽ bỏ phần chưa lưu.':'Nhập nguyên liệu và dinh dưỡng từ nguồn của bạn. Nếu chưa biết đủ macro, để trống cả bốn ô; ứng dụng không tự ước tính.', 'hint'));
  const form = node('form', { class: 'form-grid recipe-editor' }, [
    field('Tên công thức', 'name', values.name, { required: true }),
    field('Số phần', 'servings', values.servings, { type: 'number', min: '0.01', step: 'any', required: true }),
    field('Mô tả', 'description', values.description),
    field('Nguyên liệu, mỗi dòng: số lượng | đơn vị | tên', 'ingredients', values.ingredients, { tag: 'textarea', required: true }),
    field('Các bước, mỗi dòng một bước', 'steps', values.steps, { tag: 'textarea', required: true }),
    field('Thẻ (cách nhau bằng dấu phẩy)', 'tags', values.tags),
    field('Calories / phần (tùy chọn)', 'calories', values.calories, { type: 'number', min: '0', step: 'any' }),
    field('Protein / phần (g)', 'protein', values.protein, { type: 'number', min: '0', step: 'any' }),
    field('Carbs / phần (g)', 'carbs', values.carbs, { type: 'number', min: '0', step: 'any' }),
    field('Fat / phần (g)', 'fat', values.fat, { type: 'number', min: '0', step: 'any' }),
    field('Ghi chú nấu ăn', 'notes', values.notes, { tag: 'textarea' }),
    node('button', { type: 'submit', class: 'primary', text: duplicate?'Lưu bản sao':editing ? 'Lưu công thức' : 'Thêm công thức' })
  ]);
  if (editing) form.append(button('Hủy sửa', () => { editingRecipe = null; render(); }));
  if(duplicate)cookbook.bindDuplicateForm(form);
  else form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      const recipe = { id: editing?.id || id(), ...validateRecipe(raw) };
      if (editing) {
        const index = next.recipes.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.recipes[index], editing);
        next.recipes[index] = recipe;
      } else next.recipes.push(recipe);
    }, 'Đã lưu công thức.');
    if (done) { editingRecipe = null; render(); }
  });
  box.append(form);
  cookbook.renderLibrary(box,(results,recipes)=>{for (const recipe of recipes) {
    const detail = node('details', { class: 'recipe-detail' }, [node('summary', { text: `${recipe.name} · ${fmt(recipe.servings)} phần` })]);
    detail.dataset.recipeId=recipe.id;
    detail.append(nutritionPhoto('recipe', recipe.id, recipe.name));
    if (recipe.description) detail.append(p(recipe.description, 'summary'));
    const ingredients = node('ul', { class: 'history-list' });
    const cookField = field('Số phần định nấu', 'cookServings', recipe.servings, { type: 'number', min: '0.01', max: '100', step: 'any' });
    const cookInput = cookField.querySelector('input');
    const previewError = p('', 'error');
    previewError.setAttribute('role', 'status');
    const macroPreview = p('', 'hint');
    const quantityFormat = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 6 });
    const updatePreview = () => {
      ingredients.replaceChildren();
      macroPreview.textContent = '';
      try {
        const preview = scaleRecipe(recipe, cookInput.value);
        for (const item of preview.ingredients) ingredients.append(node('li', { text: `${quantityFormat.format(item.quantity)} ${item.unit} · ${item.name}` }));
        const total = recipeTotals(preview);
        const per = preview.nutritionPerServing;
        macroPreview.textContent = per ? `Mỗi phần: ${fmt(per.calories)} kcal · P ${fmt(per.protein)} · C ${fmt(per.carbs)} · F ${fmt(per.fat)}. Lượng định nấu (${quantityFormat.format(preview.servings)} phần): ${fmt(total.calories)} kcal · P ${fmt(total.protein)} · C ${fmt(total.carbs)} · F ${fmt(total.fat)}.` : 'Dinh dưỡng: DATA NOT DEFINED YET';
        previewError.textContent = '';
        cookInput.removeAttribute('aria-invalid');
      } catch (error) {
        previewError.textContent = error.message;
        cookInput.setAttribute('aria-invalid', 'true');
      }
    };
    cookInput.addEventListener('input', updatePreview);
    updatePreview();
    const steps = node('ol', { class: 'history-list' });
    for (const step of recipe.steps) steps.append(node('li', { text: step }));
    detail.append(h3('Nguyên liệu'), cookField, button('Về lượng gốc', () => { cookInput.value = recipe.servings; updatePreview(); }),
      p('Xem lượng nấu với cùng kích thước một phần; không đổi công thức gốc hoặc lượng ghi ăn. Các bước, thời gian và số trong mô tả không tự đổi; hãy đọc lại khi nấu.', 'hint'),
      previewError, ingredients, macroPreview, h3('Cách làm'), steps);
    if (recipe.tags.length) detail.append(p(`Thẻ: ${recipe.tags.join(', ')}`, 'hint'));
    if (recipe.notes) detail.append(p(`Ghi chú: ${recipe.notes}`, 'hint'));
    if (recipe.nutritionPerServing) {
      const logForm = node('form', { class: 'form-grid' }, [
        field('Ngày ghi', 'date', foodDate, { type: 'date', required: true }),
        field('Bữa', 'meal', 'Custom', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] }),
        field('Số phần', 'servings', 1, { type: 'number', min: '0.01', step: 'any', required: true }),
        node('button', { type: 'submit', class: 'primary', text: 'Ghi vào nhật ký ăn' })
      ]);
      logForm.querySelector('button[type=submit]').dataset.recipeAction='log';
      logForm.addEventListener('submit', async event => {
        event.preventDefault();
        const raw = Object.fromEntries(new FormData(logForm));
        const done = await mutate(next => {
          const current = next.recipes.find(item => item.id === recipe.id);
          ensureUnchanged(current, recipe);
          const entry = validateEntry(raw);
          next.entries.push({ id: id(), ...entry, foodId: `recipe:${recipe.id}`, food: { name: recipe.name, serving: '1 phần', ...structuredClone(recipe.nutritionPerServing) } });
        }, 'Đã ghi công thức vào nhật ký.');
        if (done) { foodDateSelection = { mode: raw.date === localDate() ? 'today' : 'selected', date: raw.date }; nutritionSubView = 'daily'; render(); }
      });
      detail.append(logForm);
    }
    const duplicateAction=button('Nhân bản',()=>cookbook.openDuplicate(recipe));duplicateAction.dataset.recipeAction='duplicate';duplicateAction.setAttribute('aria-label',`Nhân bản ${recipe.name}`);
    const cookAction=button('Chế độ nấu',()=>cookbook.openCooking(recipe));cookAction.dataset.recipeAction='cook';cookAction.setAttribute('aria-label',`Chế độ nấu ${recipe.name}`);
    detail.append(div('actions',duplicateAction,cookAction,button('Sửa', () => { if(!cookbook.discardDuplicate())return;editingRecipe = recipe.id; render();main.querySelector('.recipe-editor input')?.focus(); }),
      button('Xóa', () => confirmAction(`Xóa công thức ${recipe.name}? Nhật ký ăn giữ nguyên; ảnh còn trong Nhật ký & Ảnh.`, () => mutate(next => {
        ensureUnchanged(next.recipes.find(item => item.id === recipe.id), recipe);
        next.recipes = next.recipes.filter(item => item.id !== recipe.id);
      }, 'Đã xóa công thức.')), 'danger')));
    results.append(detail);
  }});
  main.append(box);
}

function renderNutritionSummary() {
  const current = weekStart();
  const box = panel(h2('Tổng kết dinh dưỡng'), p('Trung bình chỉ tính ngày đã ghi món. Ngày trống không được tính là 0.', 'hint'));
  let hasData = false;
  for (let index = 0; index < 4; index++) {
    const date = new Date(`${current}T12:00:00`);
    date.setDate(date.getDate() - index * 7);
    const week = weeklySummary(data, localDate(date));
    if (!week.nutritionDays) continue;
    hasData = true;
    box.append(div('list-card', h3(`${week.start} → ${week.end}`), p(`${week.nutritionDays} ngày ghi ăn · ${fmt(week.calorieAverage)} kcal/ngày · ${fmt(week.proteinAverage)} g protein/ngày · đạt mục tiêu protein ${week.proteinDaysMet}/${week.nutritionDays} ngày ghi`, 'summary')));
  }
  if (!hasData) box.append(p('Chưa có ngày ăn nào được ghi trong 4 tuần gần đây.', 'empty'));
  main.append(box);
}

function journalView() {
  main.append(panel(h2('Nhật ký & Ảnh'), p('Một vài dấu mực, vài thẻ và một đoạn ghi chú là đủ để nhớ ngày của bạn.', 'hint')));
  const nav = div('subtabs', ...[
    ['entry', 'Ghi ngày'], ['calendar', 'Lịch & dòng thời gian'], ['photos', 'Ảnh']
  ].map(([key, label]) => {
    const item = button(label, () => { journalSection = key; render(); });
    item.setAttribute('aria-pressed', String(journalSection === key));
    return item;
  }));
  main.append(nav);
  if (journalSection === 'calendar') { renderJournalCalendar(); return; }
  if (journalSection === 'photos') { renderPhotos(); return; }
  const existing = data.journalEntries.find(item => item.date === journalDate);
  const box = panel(h2(existing ? `Ghi ngày ${journalDate}` : 'Ghi lại một ngày'));
  if (journalReturnToResults) box.append(button('← Quay lại kết quả nhật ký', () => {
    journalSection = 'calendar'; show('journal'); journalRetrieval.focusSearch();
  }));
  const form = node('form', { class: 'journal-form' });
  if (existing) form.dataset.sourceId = existing.id;
  form.dataset.sourceKind = 'journal';
  const dateField = field('Ngày', 'date', journalDate, { type: 'date', required: true });
  dateField.querySelector('input').addEventListener('change', event => {
    if (!validDate(event.target.value)) { message('Ngày không hợp lệ.', true); return; }
    journalDate = event.target.value;
    render();
  });
  const moods = node('fieldset', { class: 'mood-fieldset' }, [node('legend', { text: 'Dấu mực hôm nay (tùy chọn)' })]);
  const moodChoices = div('mood-options');
  for (const mood of [{ value: '', label: 'Bỏ chọn', mark: '○' }, ...MOODS]) {
    const choice = node('label', { class: `mood-choice${(existing?.mood || '') === mood.value ? ' is-selected' : ''}` }, [node('input', { type: 'radio', name: 'mood', value: mood.value, checked: (existing?.mood || '') === mood.value ? '' : null }), node('span', { class: 'mood-mark', text: mood.mark }), node('span', { text: mood.label })]);
    choice.querySelector('input').addEventListener('change', () => {
      moodChoices.querySelectorAll('.mood-choice').forEach(item => item.classList.toggle('is-selected', item === choice));
    });
    moodChoices.append(choice);
  }
  moods.append(moodChoices);
  const tags = field('Thẻ hoạt động (cách nhau bằng dấu phẩy)', 'tags', existing?.tags.join(', ') || '');
  form.append(dateField, moods, tags);
  const suggestions = recentJournalTags(data.journalEntries);
  if (suggestions.length) {
    const input = tags.querySelector('input');
    const chips = div('tag-suggestions', p('Thẻ gần đây · bấm để chọn hoặc bỏ:', 'hint'));
    const chipButtons = [];
    const syncChips = () => {
      const selected = input.value.split(',').map(value => value.trim().toLocaleLowerCase('vi'));
      for (const [tag, chip] of chipButtons) chip.setAttribute('aria-pressed', String(selected.includes(tag.toLocaleLowerCase('vi'))));
    };
    for (const tag of suggestions) {
      const chip = button(tag, () => {
        try { input.value = toggleJournalTag(input.value, tag); syncChips(); }
        catch (error) { message(error.message, true); }
      });
      chipButtons.push([tag, chip]);
      chips.append(chip);
    }
    input.addEventListener('input', syncChips);
    syncChips();
    form.append(chips);
  }
  form.append(field('Tiêu đề (tùy chọn)', 'title', existing?.title || ''), field('Ghi chú', 'note', existing?.note || '', { tag: 'textarea' }), node('button', { type: 'submit', class: 'primary', text: existing ? 'Lưu thay đổi' : 'Lưu nhật ký' }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const saved = await mutate(next => {
      const fields = validateJournal(raw);
      const now = new Date().toISOString();
      if (existing) {
        const index = next.journalEntries.findIndex(item => item.id === existing.id);
        ensureUnchanged(next.journalEntries[index], existing);
        next.journalEntries[index] = { ...existing, ...fields, updatedAt: now };
      } else {
        if (next.journalEntries.some(item => item.date === fields.date)) throw new Error('Ngày này đã có nhật ký ở tab khác. Hãy mở lại.');
        next.journalEntries.push({ id: id(), ...fields, createdAt: now, updatedAt: now });
      }
    }, 'Đã lưu nhật ký.');
    if (saved) render();
  });
  box.append(form);
  box.append(button('Thêm ảnh ngày này', () => { editingPhoto = null; journalSection = 'photos'; render(); }));
  if (existing) box.append(button('Xóa nhật ký ngày này', () => confirmAction(`Xóa nhật ký ngày ${journalDate}${accountMode() ? '' : ' và ảnh nhật ký gắn với ngày này'}?`, async () => {
    const photoGuard = accountMode() ? null : localWorkspaceGuard();
    const removed = await mutate(next => {
      ensureUnchanged(next.journalEntries.find(item => item.id === existing.id), existing);
      next.journalEntries = next.journalEntries.filter(item => item.id !== existing.id);
    }, 'Đã xóa nhật ký.');
    if (removed && photoGuard) try { photoGuard(); await deleteDailyPhotos(existing.date, photoGuard); }
    catch (error) { message(`Nhật ký đã xóa nhưng ảnh cùng ngày chưa dọn được: ${error.message}. Hãy xóa trong mục Ảnh.`, true); }
  }), 'danger'));
  const related = data.sessions.filter(item => item.date === journalDate);
  if (related.length) box.append(p(`Buổi tập cùng ngày: ${related.map(sessionTitle).join(', ')}`, 'hint'));
  const attached = div('journal-attached');
  box.append(attached);
  const metadataOnly = Boolean(lifeSourceContext), attachedDate = journalDate;
  if(accountMode()){attached.append(p('Ảnh cục bộ không xuất hiện trong không gian tài khoản.','hint'));main.append(box);return;}
  (metadataOnly ? listPhotoMetadata() : listPhotos()).then(async photos => {
    if (!attached.isConnected) return;
    const matches = photos.filter(item => item.category === 'daily' && item.date === attachedDate);
    if (!matches.length) return;
    attached.append(h3(`Ảnh ngày này (${matches.length})`));
    const strip = div('photo-strip');
    for (const item of matches) {
      const image = metadataOnly ? await getPhotoThumbnail(item.id) : item.thumbnail || item.blob;
      if (!attached.isConnected) return;
      if (!image) { strip.append(p(`Chưa đọc được ảnh thu nhỏ · ${item.id}`, 'hint')); continue; }
      const url = URL.createObjectURL(image);
      photoUrls.push(url);
      strip.append(node('img', { src: url, alt: `Ảnh nhật ký ${item.date}`, loading: 'lazy' }));
    }
    attached.append(strip);
  }).catch(() => {});
  main.append(box);
}

function renderJournalCalendar() {
  try { journalTagOptions(data.journalEntries); }
  catch (error) { main.append(panel(p(error.message, 'notice error'))); return; }
  const month = panel(div('row', h2(`Tháng ${journalMonth}/${journalYear}`), div('actions',
    button('← Tháng trước', () => { const previous = new Date(journalYear, journalMonth - 2, 1); journalMonth = previous.getMonth() + 1; journalYear = previous.getFullYear(); render(); }),
    button('Tháng sau →', () => { const next = new Date(journalYear, journalMonth, 1); journalMonth = next.getMonth() + 1; journalYear = next.getFullYear(); render(); }))));
  const grid = div('journal-calendar');
  for (const label of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) grid.append(node('strong', { class: 'calendar-weekday', text: label }));
  for (const date of monthDays(journalYear, journalMonth)) {
    if (!date) { grid.append(div('calendar-blank')); continue; }
    const entry = data.journalEntries.find(item => item.date === date);
    const mood = MOODS.find(item => item.value === entry?.mood);
    const day = node('button', { type: 'button', class: `calendar-day${entry ? ' has-entry' : ''}`, 'data-date': date, 'aria-label': `${date}${entry ? `, có nhật ký${mood ? `, ${mood.label}` : ''}` : ', chưa có nhật ký'}`, onClick: () => { journalDate = date; journalSection = 'entry'; render(); } }, [node('span', { text: String(Number(date.slice(-2))) }), node('strong', { text: mood?.mark || (entry ? '•' : '') })]);
    grid.append(day);
  }
  month.append(grid);
  main.append(month);
  (accountMode() ? Promise.resolve([]) : lifeSourceContext ? listPhotoMetadata() : listPhotos()).then(photos => {
    if (!grid.isConnected) return;
    const dates = new Set(photos.filter(item => item.category === 'daily').map(item => item.date));
    grid.querySelectorAll('.calendar-day').forEach(day => {
      const date = day.getAttribute('data-date');
      if (dates.has(date)) { day.classList.add('has-photo'); day.setAttribute('aria-label', `${day.getAttribute('aria-label')}, có ảnh`); }
    });
  }).catch(() => {});
  journalRetrieval.renderTimeline();
}

function renderPhotos() {
  if(cloudWorkspace.read().mode!=='local'){main.append(panel(h2('Ảnh'),p('Ảnh tài khoản chưa hỗ trợ trong Batch 2. Chuyển về cục bộ để dùng kho ảnh hiện tại.','hint')));return;}
  const photoGuard = localWorkspaceGuard();
  const box = panel(h2(editingPhoto ? 'Sửa thông tin ảnh' : 'Thêm ảnh cục bộ'), p('Ảnh chỉ nằm trong trình duyệt này. Ảnh gốc trên thiết bị không bị sửa. Bản sao JSON ở Cài đặt không chứa ảnh.', 'hint'));
  const form = node('form', { class: 'form-grid' });
  const file = field('Ảnh JPG, PNG hoặc WebP (tối đa 20 MB)', 'image', '', { type: 'file' });
  file.querySelector('input').setAttribute('accept', 'image/jpeg,image/png,image/webp');
  if (editingPhoto) file.hidden = true;
  const category = field('Loại ảnh', 'category', editingPhoto?.category || 'daily', { tag: 'select', choices: PHOTO_CATEGORIES });
  if (editingPhoto?.ownerType) {
    category.querySelector('select').disabled = true;
    box.append(p('Ảnh này liên kết thư viện món/công thức; loại ảnh Món ăn được giữ nguyên.', 'hint'));
  }
  const pose = field('Góc chụp (nếu theo dõi cơ thể)', 'pose', editingPhoto?.pose || '', { tag: 'select', choices: PHOTO_POSES });
  const measurement = div('form-grid span-all', field('Cân nặng kg (tùy chọn)', 'weight', editingPhoto?.weight ?? '', { type: 'number', min: 0, step: .1 }), field('Vòng eo cm (tùy chọn)', 'waist', editingPhoto?.waist ?? '', { type: 'number', min: 0, step: .1 }));
  form.append(file, field('Ngày', 'date', editingPhoto?.date || journalDate, { type: 'date', required: true }), category, pose, measurement, field('Ghi chú ảnh', 'note', editingPhoto?.note || '', { tag: 'textarea' }));
  form.append(node('button', { type: 'submit', class: 'primary', text: editingPhoto ? 'Lưu thông tin' : 'Lưu ảnh' }));
  if (editingPhoto) form.append(button('Hủy sửa', () => { editingPhoto = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const guard = photoGuard; guard();
      const raw = Object.fromEntries(new FormData(form));
      if (editingPhoto?.ownerType) Object.assign(raw, { category: 'food', ownerType: editingPhoto.ownerType, ownerId: editingPhoto.ownerId });
      const meta = validatePhotoMeta(raw);
      const now = new Date().toISOString();
      if (editingPhoto) {
        await updatePhotoIfUnchanged(editingPhoto, meta, now, guard);
      } else {
        const selected = file.querySelector('input').files?.[0];
        validatePhotoFile(selected);
        const image = await compressPhoto(selected);
        guard();
        await putPhoto({ id: id(), ...meta, ...image, createdAt: now, updatedAt: now }, guard);
      }
      guard();
      editingPhoto = null;
      render();
      message('Đã lưu ảnh trong trình duyệt này.');
    } catch (error) { message(error.message || 'Không thể lưu ảnh.', true); }
  });
  box.append(form);
  main.append(box);
  const gallery = panel(h2('Ảnh đã lưu'));
  const selectedPhotoDate = daySourceContext?.kind === 'photos' ? daySourceContext.date : null;
  if (selectedPhotoDate) gallery.append(p(`Ảnh ngày ${selectedPhotoDate}`, 'hint'), button('Xem tất cả ảnh', () => { daySourceContext.kind = 'all-photos'; render(); }));
  const filter = field('Lọc ảnh', 'photoFilter', photoFilter, { tag: 'select', choices: [{ value: 'all', label: 'Tất cả' }, ...PHOTO_CATEGORIES] });
  filter.querySelector('select').addEventListener('change', event => { photoFilter = event.target.value; render(); });
  gallery.append(filter);
  main.append(gallery);
  listPhotos().then(records => {
    if (journalSection !== 'photos' || !gallery.isConnected) return;
    const visible = records.filter(item => (!selectedPhotoDate || item.date === selectedPhotoDate) && (photoFilter === 'all' || item.category === photoFilter)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    if (!visible.length) { gallery.append(p('Chưa có ảnh trong mục này.', 'empty')); return; }
    for (const item of visible) {
      const card = div('photo-card');
      const imageUrl = URL.createObjectURL(item.thumbnail || item.blob);
      const fullUrl = URL.createObjectURL(item.blob);
      photoUrls.push(imageUrl);
      photoUrls.push(fullUrl);
      const img = node('img', { src: imageUrl, alt: `Ảnh ${PHOTO_CATEGORIES.find(entry => entry.value === item.category)?.label || ''} ngày ${item.date}`, loading: 'lazy' });
      card.append(img, div('stack', h3(`${item.date} · ${PHOTO_CATEGORIES.find(entry => entry.value === item.category)?.label || ''}`),
        item.pose ? p(`Góc: ${PHOTO_POSES.find(entry => entry.value === item.pose)?.label || item.pose}`, 'hint') : document.createTextNode(''),
        item.weight !== null || item.waist !== null ? p(`Cân: ${item.weight ?? '—'} kg · Eo: ${item.waist ?? '—'} cm`, 'hint') : document.createTextNode(''),
        item.note ? p(item.note, 'hint') : document.createTextNode(''),
        div('actions', node('a', { class: 'secondary', href: fullUrl, target: '_blank', rel: 'noopener', text: 'Xem ảnh' }), button('Sửa', () => { editingPhoto = item; journalDate = item.date; render(); window.scrollTo(0, 0); }), button('Xóa', () => confirmAction(`Xóa ảnh ngày ${item.date}? Ảnh này sẽ mất khỏi trình duyệt.`, async () => {
          try {
            photoGuard(); await deletePhotoIfUnchanged(item, photoGuard); photoGuard();
            render(); message('Đã xóa ảnh.');
          } catch (error) { message(error.message, true); }
        }), 'danger'))));
      gallery.append(card);
    }
  }).catch(error => { if (gallery.isConnected) gallery.append(p(error.message, 'empty')); });
}

function checkinsView() {
  const nav = div('subtabs progress-tabs', ...[['overview','Tổng quan tiến độ'],['checkins','Nhập & xem check-in'],['weekly','Tuần đã ghi'],['monthly','Ký ức tháng']].map(([key,label]) => {
    const control = button(label, () => {
      if (!guardLifeSource()) return;
      if (!['weekly','monthly'].includes(key)) { try { data = readData(); } catch (error) { message(error.message, true); return; } }
      progressSubView = key; render();
    });
    control.setAttribute('aria-pressed', String(progressSubView === key)); return control;
  }));
  main.append(nav);
  if (progressSubView === 'weekly') { lifeReview.renderView(); return; }
  if (progressSubView === 'monthly') { monthMemories.renderView(); return; }
  if (progressSubView === 'overview') { progressOverview(); return; }
  const editing = data.checkins.find(item => item.id === editingCheckin);
  const box = panel(h2('Check-in cơ thể'), p('Cân nặng và vòng eo là dữ liệu quan sát. Ghi chú gối không phải chẩn đoán hoặc chỉ dẫn tăng tải.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Ngày', 'date', editing?.date || localDate(), { type: 'date', required: true }),
    field('Cân nặng (kg)', 'weight', editing?.weight ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Vòng eo (cm)', 'waist', editing?.waist ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Ngủ (giờ)', 'sleep', editing?.sleep ?? '', { type: 'number', min: '0', max: '24', step: 'any' }),
    field('Gối: đau / sưng / mất vững (tùy chọn)', 'knee', editing?.knee || '', { tag: 'textarea' }),
    field('Ghi chú khác', 'notes', editing?.notes || '', { tag: 'textarea' })
  ]);
  form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu check-in' : 'Thêm check-in' }));
  if (editing) form.append(button('Hủy sửa', () => { editingCheckin = null; render(); }));
  if (editing) form.dataset.sourceId = editing.id;
  form.dataset.sourceKind = 'checkin';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      const checkin = { id: editing?.id || id(), ...validateCheckin(raw) };
      if (editing) {
        const index = next.checkins.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.checkins[index], editing);
        next.checkins[index] = checkin;
      }
      else next.checkins.push(checkin);
    }, 'Đã lưu check-in.');
    if (done) { editingCheckin = null; render(); }
  });
  box.append(form);
  main.append(box);
  const history = panel(h2('Dữ liệu đã ghi'));
  if (!data.checkins.length) history.append(p('Chưa có check-in nào.', 'empty'));
  for (const item of [...data.checkins].sort((a, b) => b.date.localeCompare(a.date))) {
    history.append(div('list-card', h3(item.date), p([item.weight !== null ? `${fmt(item.weight)} kg` : '', item.waist !== null ? `${fmt(item.waist)} cm eo` : '', item.sleep !== null ? `${fmt(item.sleep)} giờ ngủ` : ''].filter(Boolean).join(' · ') || 'Ghi chú', 'summary'), item.knee ? p(`Gối: ${item.knee}`, 'hint') : document.createTextNode(''), item.notes ? p(item.notes, 'hint') : document.createTextNode(''), div('actions', button('Sửa', () => { editingCheckin = item.id; render(); window.scrollTo(0, 0); }), button('Xóa', () => confirmAction(`Xóa check-in ${item.date}?`, () => mutate(next => { next.checkins = next.checkins.filter(entry => entry.id !== item.id); }, 'Đã xóa check-in.')), 'danger'))));
  }
  main.append(history);
}

function progressOverview() {
  const current = weekStart();
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(`${current}T12:00:00`);
    date.setDate(date.getDate() - index * 7);
    return weeklySummary(data, localDate(date));
  });
  const latest = weeks[0];
  const box = panel(h2('Tổng kết tuần'), p(`${latest.start} → ${latest.end} · chỉ tính những ngày có dữ liệu thực.`, 'hint'));
  box.append(div('stats', stat('Buổi tập', String(latest.workouts)), stat('Cardio', `${fmt(latest.cardioMinutes)} phút`),
    stat('Cân trung bình', latest.weightAverage === null ? 'Chưa có' : `${fmt(latest.weightAverage)} kg`),
    stat('Eo trung bình', latest.waistAverage === null ? 'Chưa có' : `${fmt(latest.waistAverage)} cm`)));
  box.append(p(`A ${latest.sessionCounts.A} · B ${latest.sessionCounts.B} · C ${latest.sessionCounts.C} · D ${latest.sessionCounts.D} · Custom ${latest.sessionCounts.CUSTOM} · ${latest.kneeRecords} ghi nhận gối`, 'summary'));
  box.append(p(latest.nutritionDays ? `Đã ghi ăn ${latest.nutritionDays} ngày · trung bình ${fmt(latest.calorieAverage)} kcal, ${fmt(latest.proteinAverage)} g protein · đạt mục tiêu protein ${latest.proteinDaysMet}/${latest.nutritionDays} ngày đã ghi.` : 'Chưa có dữ liệu ăn uống trong tuần; ngày chưa ghi không được tính là ăn 0 kcal.', latest.nutritionDays ? 'summary' : 'empty'));
  main.append(box);
  const trend = panel(h2('4 tuần gần đây'), p('Trung bình chỉ dựa trên những lần bạn thực sự ghi. Chưa có dữ liệu được hiển thị riêng.', 'hint'));
  const observedWeeks = weeks.filter(week => week.workouts || week.weightAverage !== null || week.waistAverage !== null || week.nutritionDays || week.cardioMinutes || week.kneeRecords);
  if (!observedWeeks.length) trend.append(p('Chưa có dữ liệu tiến độ trong 4 tuần gần đây.', 'empty'));
  for (const week of observedWeeks) trend.append(div('list-card', h3(`${week.start} → ${week.end}`),
    p(`${week.workouts} buổi tập · cân TB ${week.weightAverage === null ? 'chưa có' : `${fmt(week.weightAverage)} kg`} · eo TB ${week.waistAverage === null ? 'chưa có' : `${fmt(week.waistAverage)} cm`}`, 'summary'),
    p(week.nutritionDays ? `${week.nutritionDays} ngày ghi ăn · ${fmt(week.calorieAverage)} kcal/ngày · ${fmt(week.proteinAverage)} g protein/ngày` : 'Chưa ghi ăn tuần này.', 'hint')));
  main.append(trend);
  const names = [...new Set(data.sessions.flatMap(session => session.sets.map(set => set.exerciseName)))].sort();
  const exerciseBox = panel(h2('Lịch sử theo bài'), p('Số liệu được ghi lại; ứng dụng không tự yêu cầu tăng tạ.', 'hint'));
  if (!names.length) exerciseBox.append(p('Chưa có hiệp tập nào để xem.', 'empty'));
  else {
    if (!names.includes(selectedExercise)) selectedExercise = names[0];
    const selector = field('Chọn bài', 'exercise', selectedExercise, { tag: 'select', choices: names });
    selector.querySelector('select').addEventListener('change', event => { selectedExercise = event.target.value; render(); });
    exerciseBox.append(selector);
    let limit = 20;
    const status = p('', 'hint exercise-history-status'); status.setAttribute('role', 'status');
    const rows = div('exercise-history-rows'), controls = div('actions');
    function updateHistory(focusIndex = null) {
      const page = exerciseHistoryPage(data.sessions, selectedExercise, limit);
      rows.replaceChildren(); controls.replaceChildren();
      status.textContent = `Hiển thị ${page.items.length}/${page.total} hiệp`;
      for (const set of page.items) {
        const row = div('list-card', p(`${set.date} · ${set.workoutName} · Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}`, 'summary'));
        row.dataset.setId = set.id; row.setAttribute('tabindex', '-1'); rows.append(row);
      }
      if (page.hasMore) controls.append(button('Xem thêm', () => { const previousCount = page.items.length; limit += 20; updateHistory(previousCount); }));
      if (focusIndex !== null && rows.children[focusIndex]) { rows.children[focusIndex].focus({ preventScroll: true }); rows.children[focusIndex].scrollIntoView({ block: 'center' }); }
    }
    exerciseBox.append(status, rows, controls); updateHistory();
  }
  main.append(exerciseBox);
}

function settingsView() {
  main.append(cloudAuthUI.mount());
  main.append(cloudWorkspaceUI.mount());
  const box = panel(h2('Cài đặt'), p('Tuần chương trình được chọn thủ công. Calories và protein là mức thử ban đầu từ MASTER_PLAN.md; thay đổi tại đây không sửa plan.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Tuần chương trình (1–12)', 'week', data.settings.week, { type: 'number', min: '1', max: '12', step: '1', required: true }),
    field('Calories mục tiêu / ngày', 'calories', data.settings.calories, { type: 'number', min: '0', step: 'any', required: true }),
    field('Protein mục tiêu (g/ngày)', 'protein', data.settings.protein, { type: 'number', min: '0', step: 'any', required: true })
  ]);
  form.append(node('button', { type: 'submit', class: 'primary', text: 'Lưu cài đặt' }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    mutate(next => {
      const week = Number(raw.week), calories = Number(raw.calories), protein = Number(raw.protein);
      if (!Number.isInteger(week) || week < 1 || week > 12) throw new Error('Tuần phải từ 1 đến 12.');
      if (!Number.isFinite(calories) || calories < 0 || !Number.isFinite(protein) || protein < 0) throw new Error('Mục tiêu phải là số không âm.');
      next.settings = { week, calories, protein };
    }, 'Đã lưu cài đặt.');
  });
  box.append(form);
  main.append(box);
  const backup = panel(h2('Sao lưu dữ liệu'), p('Để sao lưu đủ, tải HAI file: dữ liệu chữ/số và ảnh. Hai file đều riêng tư. Khôi phục JSON chỉ thay dữ liệu chữ/số; khôi phục ảnh chỉ thêm ảnh chưa có.', 'hint'), div('actions', button('Chuẩn bị file dữ liệu JSON', exportData, 'primary'), button('Sao chép JSON', copyData)), div('actions', node('span', { id: 'backup-link' })), p('Nếu trình duyệt không tải file dữ liệu, dùng Sao chép JSON và lưu nội dung vào file .json riêng tư.', 'hint'));
  const dataStatus = backupStatus('data'); dataStatus.dataset.backupStatus = 'data'; dataStatus.setAttribute('role', 'status'); backup.append(dataStatus);
  if(accountMode()){backup.append(p('JSON chỉ xuất projection tài khoản đang chọn; không chứa token/outbox hay ảnh. Restore và nhập dữ liệu thật cần Batch 3.','hint'));main.append(backup,p('Ảnh tài khoản chưa hỗ trợ; kho ảnh và backup ảnh cục bộ được giữ riêng.','hint'));return;}
  const fileField = field('Chọn file JSON để khôi phục', 'restoreFile', '', { type: 'file' });
  fileField.querySelector('input').setAttribute('accept', '.json,application/json');
  fileField.querySelector('input').addEventListener('change', previewRestore);
  backup.append(h3('Khôi phục dữ liệu'), p('Kiểm tra file và xem trước trước khi thay thế dữ liệu hiện tại.', 'hint'), fileField, div('restore-preview'));
  main.append(backup);
  renderRestorePreview();
  const photos = panel(h2('Sao lưu ảnh'), p('Ảnh JPEG đã nén được đóng gói trong file JSON riêng. Nếu không tải được, có thể sao chép JSON sau khi chuẩn bị và lưu vào file riêng tư. File này có thể lớn hơn kho ảnh do mã hóa base64; tối đa 200 MB ảnh. Không đưa file ảnh cá nhân lên GitHub.', 'hint'), div('actions', button('Chuẩn bị file ảnh', exportPhotos, 'primary')), node('span', { id: 'photo-backup-link' }));
  const photoStatus = backupStatus('photos'); photoStatus.dataset.backupStatus = 'photos'; photoStatus.setAttribute('role', 'status'); photos.append(photoStatus);
  photos.append(p('Checklist: giữ file dữ liệu và file ảnh cùng lần sao lưu; kiểm tra cả hai thực sự tồn tại trên máy. Liên kết tải chỉ là file đã chuẩn bị. Khôi phục dữ liệu trước, rồi ảnh; hai phần không có transaction chung.', 'hint'));
  const photoFile = field('Chọn file ảnh Tracker để khôi phục', 'photoRestoreFile', '', { type: 'file' });
  photoFile.querySelector('input').setAttribute('accept', '.json,application/json');
  photoFile.querySelector('input').addEventListener('change', previewPhotoRestore);
  photos.append(h3('Khôi phục ảnh'), p('Xem trước rồi thêm ảnh chưa có. Ảnh cùng ID đang lưu sẽ được giữ nguyên.', 'hint'), photoFile, div('photo-restore-preview'));
  main.append(photos);
  renderPhotoRestorePreview();
}

async function exportPhotos() {
  if(cloudWorkspace.read().mode!=='local')throw Error('Ảnh tài khoản chưa hỗ trợ.');
  const guard = localWorkspaceGuard();
  try {
    const records = await listPhotos();
    const packed = await createPhotoBackup(records);
    guard();
    const nextUrl = URL.createObjectURL(new Blob([packed], { type: 'application/json' }));
    if (photoBackupUrl) URL.revokeObjectURL(photoBackupUrl);
    photoBackupUrl = nextUrl;
    const link = node('a', { href: photoBackupUrl, download: `tracker-photos-${localDate()}.json`, class: 'primary', text: `Tải file ảnh (${records.length} ảnh)` });
    link.addEventListener('click', () => setBackupStatus('photos', 'Đã yêu cầu trình duyệt tải file ảnh; hãy kiểm tra file trên máy.'));
    document.querySelector('#photo-backup-link').replaceChildren(link, button('Sao chép JSON ảnh đã chuẩn bị', async () => {
      try { await navigator.clipboard.writeText(packed); setBackupStatus('photos', 'Đã sao chép JSON ảnh đã chuẩn bị; dán vào file .json riêng tư và kiểm tra file.'); }
      catch { message('Không sao chép được ảnh. Hãy dùng liên kết tải file.', true); }
    }));
    setBackupStatus('photos', `Đã chuẩn bị file: ${records.length} ảnh. Chưa xác nhận tải về.`);
    message('File ảnh đã sẵn sàng. Hãy tải và giữ cùng bản sao dữ liệu.');
  } catch (error) { setBackupStatus('photos', `Không chuẩn bị được file mới: ${error.message}`); message(error.message || 'Không xuất được ảnh.', true); }
}

async function previewPhotoRestore(event) {
  if(cloudWorkspace.read().mode!=='local')return;
  const guard = localWorkspaceGuard();
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 280_000_000) throw new Error('File ảnh vượt 280 MB.');
    const parsed = parsePhotoBackup(await file.text());
    const existing = new Set((await listPhotos()).map(item => item.id));
    guard();
    photoRestorePreview = { ...parsed, addCount: parsed.photos.filter(item => !existing.has(item.id)).length, orphans: orphanPhotoOwners(parsed.photos, readData()).length };
    renderPhotoRestorePreview();
    message('Đã kiểm tra file ảnh. Xem trước trước khi nhập.');
  } catch (error) { photoRestorePreview = null; renderPhotoRestorePreview(); message(error.message, true); }
}

function renderPhotoRestorePreview() {
  const box = document.querySelector('.photo-restore-preview');
  if (!box) return;
  box.replaceChildren();
  if (!photoRestorePreview) return;
  const guard = localWorkspaceGuard();
  const selected = photoRestorePreview;
  box.append(h3('Xem trước ảnh'), p(`Xuất lúc: ${selected.exportedAt}`, 'hint'), p(`${selected.photos.length} ảnh trong file · ${selected.addCount} ảnh mới dự kiến thêm · ${(selected.bytes / 1_000_000).toFixed(1)} MB dữ liệu ảnh`, 'summary'));
  if (selected.orphans) box.append(p(`${selected.orphans} ảnh có món/công thức chủ sở hữu chưa tồn tại. Nhập dữ liệu trước nếu có; ảnh vẫn có thể giữ trong gallery, không tự tạo chủ sở hữu.`, 'notice'));
  box.append(div('actions', button('Hủy', () => { photoRestorePreview = null; renderPhotoRestorePreview(); }), button('Thêm ảnh từ file', async () => {
    try {
      guard();
      const result = await addMissingPhotos(selected.photos, guard);
      guard();
      setBackupStatus('photos', `Đã khôi phục phần ảnh: thêm ${result.added}, giữ ${result.skipped} ID đã có. Phần dữ liệu khôi phục riêng.`);
      photoRestorePreview = null;
      renderPhotoRestorePreview();
      message(`Đã thêm ${result.added} ảnh; giữ nguyên ${result.skipped} ảnh đã có.`);
    } catch (error) { message(error.message || 'Không nhập được ảnh.', true); }
  }, 'primary')));
}

async function previewRestore(event) {
  if(cloudWorkspace.read().mode!=='local')return;
  const guard = localWorkspaceGuard();
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000) throw new Error('File JSON quá lớn (tối đa 10 MB).');
    const parsed = parseBackup(await file.text());
    guard();
    restorePreview = { ...parsed, baseline: JSON.stringify(readData()) };
    renderRestorePreview();
    message('Đã kiểm tra file. Xem số lượng dữ liệu trước khi khôi phục.');
  } catch (error) { restorePreview = null; renderRestorePreview(); message(error.message, true); }
}

function renderRestorePreview() {
  const box = document.querySelector('.restore-preview');
  if (!box) return;
  box.replaceChildren();
  if (!restorePreview) { if (restoreSafetyUrl) URL.revokeObjectURL(restoreSafetyUrl); restoreSafetyUrl = null; return; }
  const counts = restorePreview.counts;
  box.append(h3('Xem trước bản khôi phục'), p(`Xuất lúc: ${restorePreview.exportedAt || 'Không có thông tin (file kiểu cũ)'}`, 'hint'),
    p(`${counts.sessions} buổi tập · ${counts.sets} hiệp · ${counts.foods} thực phẩm · ${counts.entries} bữa ăn · ${counts.checkins} check-in · ${counts.cardio} cardio · ${counts.knee} ghi gối · ${counts.savedMeals} bữa lưu · ${counts.recipes} công thức · ${counts.journal} nhật ký · ${counts.customExercises} bài custom · ${counts.plans} kế hoạch · ${counts.planningDrafts} bản nháp trước Start · có cài đặt`, 'summary'));
  if (restoreSafetyUrl) URL.revokeObjectURL(restoreSafetyUrl);
  restoreSafetyUrl = URL.createObjectURL(new Blob([createBackup(data)], { type: 'application/json' }));
  box.append(node('a', { href: restoreSafetyUrl, download: `tracker-before-restore-${localDate()}.json`, class: 'secondary', text: 'Tải bản sao dữ liệu hiện tại' }));
  const acknowledged = field('Tôi đã lưu bản sao dữ liệu hiện tại', 'savedBackup', '', { type: 'checkbox' });
  const checkbox = acknowledged.querySelector('input');
  const restoreButton = button('Khôi phục từ file', restoreData, 'danger');
  restoreButton.disabled = true;
  checkbox.addEventListener('change', () => { restoreButton.disabled = !checkbox.checked; });
  box.append(acknowledged, div('actions', button('Hủy', () => { restorePreview = null; renderRestorePreview(); }), restoreButton));
}

async function restoreData() {
  if (!restorePreview || cloudWorkspace.read().mode !== 'local') return;
  const selected = restorePreview;
  const done = await mutate(next => {
    restoreBackupData(next, selected.data, selected.baseline);
  }, 'Đã khôi phục dữ liệu từ file.');
  if (done) { sessionStore.reset(); sessionUI.reset(); drafts.reset(); gymBuilder.reset(); plannerView.reset(); restorePreview = null; renderRestorePreview(); setBackupStatus('data', 'Đã khôi phục phần dữ liệu. Ảnh chưa được khôi phục bằng thao tác này.'); }
}

async function copyData() {
  try { await navigator.clipboard.writeText(createBackup(readData())); message('Đã sao chép JSON. Dán vào file .json riêng tư để sao lưu.'); }
  catch { message('Trình duyệt không cho sao chép. Hãy dùng liên kết tải file.', true); }
}

function exportData() {
  try {
    const blob = new Blob([createBackup(readData())], { type: 'application/json' });
    const nextUrl = URL.createObjectURL(blob);
    if (backupUrl) URL.revokeObjectURL(backupUrl);
    backupUrl = nextUrl;
    const link = node('a', { href: backupUrl, download: `tracker-backup-${localDate()}.json`, class: 'primary', text: 'Tải file JSON' });
    link.addEventListener('click', () => setBackupStatus('data', 'Đã yêu cầu trình duyệt tải file dữ liệu; hãy kiểm tra file trên máy.'));
    document.querySelector('#backup-link').replaceChildren(link);
    setBackupStatus('data', 'Đã chuẩn bị file dữ liệu và planning drafts. File này không chứa ảnh; chưa xác nhận tải về.');
    message('File đã sẵn sàng. Chọn “Tải file JSON” để lưu.');
  } catch (error) { message(`Không thể xuất dữ liệu: ${error.message}`, true); }
}

try { data = readData(); }
catch (error) {
  data = emptyData(); view = 'checkins'; progressSubView = 'weekly';
  // Keep the independent read screen accessible; existing editors still use loadData.
  message('Chưa đọc được dữ liệu JSON. Tuần đã ghi vẫn có thể đọc metadata ảnh riêng.', true);
}
drafts.reset();
sessionStore.reset();
updateNavigation();
render();
