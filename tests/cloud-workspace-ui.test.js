import test from 'node:test';
import assert from 'node:assert/strict';
const imported = await import('../js/cloud-workspace-ui.js').catch(() => ({}));
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.parent = null; this._text = ''; this.value = ''; }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(' '); } set textContent(value) { this._text = String(value); this.children = []; }
  get isConnected() { return this.root || Boolean(this.parent?.isConnected); }
  append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } }
  replaceChildren(...items) { this.children.forEach(x => x.parent = null); this.children = []; this._text = ''; this.append(...items); }
  setAttribute(key, value) { this.attributes[key] = String(value); } getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type) { return Promise.all((this.listeners[type] ?? []).map(fn => fn({ preventDefault() {}, target: this }))); }
}
const all = root => root.children.flatMap(x => [x, ...all(x)]);
function setup(state = { mode: 'local', syncStatus: 'local', outboxCount: 0, conflicts: [] }) {
  const scope = { uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' };
  let authState = { status: 'authenticated', account: { ...scope, assurance: 'verified' } }, reads = 0;
  const node = (tag, options = {}, children = []) => { const e = new Element(tag); for (const [key, value] of Object.entries(options)) { if (key === 'text') e.textContent = value; else if (key === 'onClick') e.addEventListener('click', value); else e.setAttribute(key, value); } e.append(...children); return e; };
  const helpers = { node, button: (label, fn) => node('button', { text: label, onClick: fn }), p: (text, cls) => node('p', { text, class: cls }), h2: text => node('h2', { text }), div: (cls, ...children) => node('div', { class: cls }, children), panel: (...children) => node('section', {}, children) };
  const calls = [], listeners = [], authListeners = []; const reviewToken = Object.freeze({});
  const workspace = { read: () => structuredClone(state), subscribe: fn => listeners.push(fn), getData: () => ({ foods: [] }), getConflict: async id => { calls.push(['review', id]); return { id, base: { name: 'Base' }, local: { name: '<img src=x>' }, remote: { name: 'Remote' }, reviewToken }; }, ...Object.fromEntries(['openAccount', 'localOnly', 'sync', 'pause', 'resume', 'refresh', 'resolveConflict'].map(action => [action, async (...args) => { calls.push([action, ...args]); }])) };
  const auth = { read: () => authState, subscribe: fn => authListeners.push(fn) };
  assert.equal(typeof imported.createCloudWorkspaceUI, 'function');
  const ui = imported.createCloudWorkspaceUI({ workspace, auth, helpers, loadAnonymous: () => { reads++; return { schemaVersion: 8, foods: [{ id: 'f', name: 'Food' }] }; }, listAnonymousPhotoMetadata: () => { reads++; return []; } });
  const main = node('main'); main.root = true; const dirty = node('input'); dirty.value = '1777'; main.append(dirty, ui.mount());
  return { main, dirty, calls, workspace, reviewToken, reads: () => reads, emit: patch => { Object.assign(state, patch); listeners.forEach(fn => fn()); }, authEmit: patch => { authState = patch; authListeners.forEach(fn => fn()); }, scope };
}
const find = (main, text) => all(main).find(el => el.tagName === 'button' && el.textContent.includes(text));
test('retained conflicts cannot hide paused status or remove the resume control',async()=>{
 const s=setup({mode:'account',syncStatus:'paused',outboxCount:0,photoPendingCount:1,conflicts:[],photoConflicts:[{conflict:{base:[],local:[],remote:[]}}]});
 assert.match(s.main.textContent,/Đã tạm dừng đồng bộ/);assert.ok(find(s.main,'Tiếp tục đồng bộ'));
 await find(s.main,'Tiếp tục đồng bộ').dispatch('click');assert.equal(s.calls.at(-1)[0],'resume');
});
test('provisioning identity is displayed as safe text only for an open workspace and does not trigger sync',()=>{
 const s=setup({mode:'account',syncStatus:'pending',outboxCount:0,conflicts:[],uid:'synthetic-user',projectId:'synthetic-project',environment:'preview',deviceId:'synthetic-device'});
 assert.match(s.main.textContent,/Thông tin thiết bị/);assert.match(s.main.textContent,/synthetic-device/);assert.equal(s.calls.length,0);
 s.emit({mode:'sealed',uid:null,deviceId:null});assert.ok(!s.main.textContent.includes('synthetic-device'));
});
test('local workspace requires verified activation and never scans anonymous data automatically', async () => {
  const s = setup(); assert.match(s.main.textContent, /Chỉ trên thiết bị/); assert.equal(s.reads(), 0);
  s.authEmit({ status: 'signed-out', account: null }); assert.equal(find(s.main, 'Mở dữ liệu tài khoản').disabled, true);
  s.authEmit({ status: 'authenticated', account: { ...s.scope, assurance: 'verified' } }); await find(s.main, 'Mở dữ liệu tài khoản').dispatch('click'); assert.equal(s.calls[0][0], 'openAccount');
});
test('durable status changes preserve unrelated input and pending never announces synced', () => {
  const s = setup({ mode: 'account', syncStatus: 'synced', outboxCount: 1, conflicts: [] }); assert.ok(!s.main.textContent.includes('Đã đồng bộ')); assert.match(s.main.textContent, /Chờ đồng bộ/);
  for (const status of ['offline', 'needsLogin', 'failed', 'paused', 'syncing', 'conflict']) s.emit({ syncStatus: status });
  assert.equal(s.dirty.value, '1777'); s.emit({ syncStatus: 'synced', outboxCount: 0 }); assert.match(s.main.textContent, /Đã đồng bộ/);
});
test('sealed queue is labeled unknown and cannot be presented as an empty queue',()=>{
 const s=setup({mode:'sealed',syncStatus:'needs-login',outboxCount:null,conflicts:[]});
 assert.match(s.main.textContent,/Thao tác chờ: chưa đọc được khi kho chưa mở/);
 assert.ok(!s.main.textContent.includes('Thao tác chờ: 0'));
});
test('unknown pending count cannot announce synced', () => {
  const s = setup({ mode: 'account', syncStatus: 'synced', conflicts: [] }); assert.ok(!s.main.textContent.includes('Đã đồng bộ'));
});
test('refresh cached latest is an explicit action separate from sync', async () => {
  const s = setup({ mode: 'account', syncStatus: 'pending', outboxCount: 2, conflicts: [] });
  await find(s.main, 'Đồng bộ ngay').dispatch('click'); await find(s.main, 'Tải lại dữ liệu mới nhất').dispatch('click');
  assert.deepEqual(s.calls.map(x => x[0]), ['sync', 'refresh']); assert.equal(s.dirty.value, '1777');
});
test('conflict values are safe text and choosing either side requires an explicit review token', async () => {
  const s = setup({ mode: 'account', syncStatus: 'conflict', outboxCount: 1, conflicts: [{ id: 'c', kind: 'food', recordId: 'f' }] });
  assert.equal(find(s.main, 'Giữ bản trên máy'), undefined); await find(s.main, 'Xem xung đột').dispatch('click'); assert.match(s.main.textContent, /<img src=x>/);
  assert.equal(all(s.main).some(el => el.tagName === 'img'), false); await find(s.main, 'Giữ bản trên máy').dispatch('click');
  assert.deepEqual(s.calls.at(-1), ['resolveConflict', 'c', 'local', s.reviewToken]);
});
test('import preview needs explicit button, estimates only and cancel mutates nothing', async () => {
  const s = setup({ mode: 'account', syncStatus: 'synced', outboxCount: 0, conflicts: [], uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' });
  assert.equal(s.reads(), 0); await find(s.main, 'Xem trước dữ liệu cục bộ').dispatch('click'); assert.equal(s.reads(), 2); assert.match(s.main.textContent, /chưa nhập|Chưa nhập/);
  await find(s.main, 'Hủy xem trước').dispatch('click'); assert.equal(s.calls.length, 0); assert.ok(!s.main.textContent.includes('Ứng viên: 1'));
});
test('changing account invalidates in-memory import/conflict review', async () => {
  const s = setup({ mode: 'account', syncStatus: 'conflict', outboxCount: 1, conflicts: [{ id: 'c' }], uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' });
  await find(s.main, 'Xem xung đột').dispatch('click'); s.emit({ uid: '22222222-2222-4222-8222-222222222222', conflicts: [] }); assert.equal(find(s.main, 'Giữ bản trên máy'), undefined);
});
test('cached workspace access is explicit and sync waits for matching authenticated account', async () => {
  const s = setup(); s.workspace.cachedScopes = async () => [s.scope]; s.workspace.openCached = async scope => s.calls.push(['openCached', scope]);
  s.authEmit({ status: 'signed-out', account: null }); await find(s.main, 'Tài khoản đã lưu trên thiết bị').dispatch('click');
  assert.match(s.main.textContent, /không mã hóa/); await find(s.main, s.scope.uid).dispatch('click'); assert.deepEqual(s.calls.at(-1), ['openCached', s.scope]);
  s.emit({ mode: 'account', syncStatus: 'needsLogin', ...s.scope }); assert.equal(find(s.main, 'Đồng bộ ngay').disabled, true);
});
test('reauthenticated cached workspace needs explicit account activation before sync', async () => {
  const s = setup({ mode: 'account', cached: true, syncStatus: 'needs-login', outboxCount: 1, conflicts: [], uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' });
  assert.equal(find(s.main, 'Đồng bộ ngay').disabled, true); assert.ok(find(s.main, 'Mở dữ liệu tài khoản'));
  assert.equal(s.calls.length, 0); await find(s.main, 'Mở dữ liệu tài khoản').dispatch('click'); assert.deepEqual(s.calls[0], ['openAccount']);
});
test('pending workspace switch needs opaque confirmation and cancel has no transition', async () => {
  const s = setup(), confirmation = Object.freeze({});
  s.workspace.openAccount = async ticket => { s.calls.push(['openAccount', ticket]); return ticket === confirmation ? { applied: true } : { warning: true, confirmation }; };
  s.workspace.cancelWarning = () => s.calls.push(['cancel']);
  await find(s.main, 'Mở dữ liệu tài khoản').dispatch('click'); await find(s.main, 'Hủy chuyển không gian').dispatch('click'); assert.deepEqual(s.calls.at(-1), ['cancel']);
  await find(s.main, 'Mở dữ liệu tài khoản').dispatch('click'); await find(s.main, 'Xác nhận chuyển không gian').dispatch('click'); assert.deepEqual(s.calls.at(-1), ['openAccount', confirmation]);
});
test('stale conflict review response after account change is not displayed', async () => {
  const s = setup({ mode: 'account', syncStatus: 'conflict', outboxCount: 1, conflicts: [{ id: 'c' }], uid: '11111111-1111-4111-8111-111111111111' });
  let finish; s.workspace.getConflict = () => new Promise(resolve => finish = resolve);
  const pending = find(s.main, 'Xem xung đột').dispatch('click'); s.emit({ uid: '22222222-2222-4222-8222-222222222222', conflicts: [] });
  finish({ id: 'c', base: null, local: 'Old account secret', remote: null, reviewToken: s.reviewToken }); await pending;
  assert.ok(!s.main.textContent.includes('Old account secret')); assert.equal(find(s.main, 'Giữ bản trên máy'), undefined);
});
test('blocked local conflict resolution explains next action and retains comparison', async () => {
  const s = setup({ mode: 'account', syncStatus: 'conflict', outboxCount: 1, conflicts: [{ id: 'c' }] });
  s.workspace.resolveConflict = async () => ({ applied: false, code: 'copy_required' });
  await find(s.main, 'Xem xung đột').dispatch('click'); await find(s.main, 'Giữ bản trên máy').dispatch('click');
  assert.match(s.main.textContent, /bản server đã bị xóa/i); assert.ok(find(s.main, 'Dùng bản server')); assert.match(s.main.textContent, /<img src=x>/);
  s.workspace.resolveConflict = async () => ({ applied: false, code: 'compound_review_required' });
  await find(s.main, 'Giữ bản trên máy').dispatch('click'); assert.match(s.main.textContent, /nhiều thao tác/i);
});
test('changed conflict baseline requires new explicit review', async () => {
  const s = setup({ mode: 'account', syncStatus: 'conflict', outboxCount: 1, conflicts: [{ id: 'c' }] });
  s.workspace.resolveConflict = async () => ({ applied: false, code: 'review_changed' });
  await find(s.main, 'Xem xung đột').dispatch('click'); await find(s.main, 'Giữ bản trên máy').dispatch('click');
  assert.match(s.main.textContent, /xem xung đột lại/i); assert.equal(find(s.main, 'Giữ bản trên máy'), undefined);
});
test('conflict labels list aggregate identities with legacy fallback', () => {
  const s = setup({ mode: 'account', syncStatus: 'conflict', outboxCount: 1, conflicts: [{ id: 'c', identities: [{ kind: 'food', recordId: 'f' }, { kind: 'meal_entry', recordId: 'm' }] }, { id: 'old', kind: 'journal', recordId: 'j' }] });
  assert.match(find(s.main, 'Xem xung đột · food f').textContent, /meal_entry m/); assert.ok(find(s.main, 'Xem xung đột · journal j'));
});
test('remote live workout selection is explicit and never happens during render', async () => {
  const s = setup({ mode: 'account', syncStatus: 'pending', outboxCount: 0, conflicts: [] });
  s.workspace.availableLive = () => [{ recordId: 's', payload: { date: '2026-10-09', workout: 'CUSTOM', workoutSnapshot: { name: 'Upper' } } }];
  s.workspace.getData = () => ({ draft: null }); s.workspace.selectLive = async id => s.calls.push(['selectLive', id]);
  s.emit({}); assert.equal(s.calls.length, 0); const choice = find(s.main, 'Tiếp tục buổi đang tập'); assert.match(choice.textContent, /2026-10-09.*Upper.*s/);
  await choice.dispatch('click'); assert.deepEqual(s.calls, [['selectLive', 's']]);
});
test('live workout selection does not offer replacement when a local draft is already selected', () => {
  const s = setup({ mode: 'account', syncStatus: 'pending', outboxCount: 0, conflicts: [] });
  s.workspace.availableLive = () => [{ recordId: 'remote', payload: { workout: 'A' } }]; s.workspace.getData = () => ({ draft: { id: 'already-selected' } }); s.emit({});
  assert.equal(find(s.main, 'Tiếp tục buổi đang tập'), undefined); assert.equal(s.calls.length, 0);
});
