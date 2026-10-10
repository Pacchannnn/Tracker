import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { emptyData } from '../js/data.js';
import { createDraftStore, plannerPayload } from '../js/planning-draft.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const writePart = section('async function writeData(', '\nasync function readWorkspacePhotos(');
const mutatePart = section('async function mutate(', '\nfunction show(');
const actionPart = section('async function sessionAction(', '\nconst myDay =');
const draftsPart = section('const drafts = createDraftStore(', '\nconst sessionStore =');
const uiPart = section('const cloudWorkspaceUI = createCloudWorkspaceUI(', '\nlet lastWorkspaceIdentity');
const deferred = () => { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
function fixture() {
  let state = { mode: 'account', epoch: 1, uid: 'A' };
  const renders = [], messages = [], resetCalls = [];
  const env = { data: { owner: 'A-before' }, sourceFormBaseline: [], accountMode: () => true, channel: null,
    cloudWorkspace: { read: () => state, write: async () => ({ owner: 'A-after' }) },
    queueMicrotask() { queueMicrotask(switchAccount); }, syncForeground() {},
    sourceFormValues: () => [], render() { renders.push(env.data.owner); }, message(value) { messages.push(value); },
    drafts: { reset() { resetCalls.push('drafts'); } }, sessionStore: { reset() { resetCalls.push('sessions'); } }
  };
  function switchAccount() { state = { mode: 'account', epoch: 2, uid: 'B' }; env.data = { owner: 'B' }; }
  return { env, renders, messages, resetCalls, switchAccount, state: () => state };
}
test('actual app mutate checks its own continuation epoch before accepting old account data', async () => {
  const f = fixture();
  const result = await vm.runInNewContext(writePart + '\n' + mutatePart + '\nmutate(()=>{});', f.env);
  assert.equal(result, false); assert.equal(f.state().uid, 'B'); assert.equal(f.env.data.owner, 'B'); assert.deepEqual(f.renders, []);
  assert.ok(!f.messages.includes('Đã lưu.'));
});
test('actual drafts write adapter cannot assign a completed old-scope result into new account memory', async () => {
  const f = fixture(); f.env.createDraftStore = options => { f.env.draftWrite = options.write; return {}; };
  vm.runInNewContext(writePart + '\n' + draftsPart, f.env);
  await assert.rejects(() => f.env.draftWrite(() => {}), /không gian cũ|không gian.*đổi/i);
  assert.equal(f.env.data.owner, 'B');
});
for (const action of ['selectLive', 'refresh']) {
  test(`actual account ${action} wrapper cannot assign or render old result after account switch`, async () => {
    const f = fixture();
    Object.assign(f.env, Object.fromEntries(['node', 'button', 'field', 'panel', 'div', 'p', 'h2'].map(name => [name, () => {}])));
    f.env.cloudAuth = {}; f.env.localStorage = { getItem: () => null }; f.env.emptyData = emptyData; f.env.listPhotoMetadata = () => [];
    f.env.createCloudWorkspaceUI = options => { f.env.boundWorkspace = options.workspace; return {}; };
    f.env.cloudWorkspace.selectLive = async () => { queueMicrotask(f.switchAccount); return { owner: 'A-after' }; };
    f.env.cloudWorkspace.reviewLatest = async () => { queueMicrotask(f.switchAccount); return { applied: true, data: { owner: 'A-after' } }; };
    vm.runInNewContext(writePart + '\n' + uiPart, f.env);
    await assert.rejects(() => f.env.boundWorkspace[action]('synthetic'), /không gian cũ|không gian.*đổi/i);
    assert.equal(f.env.data.owner, 'B'); assert.deepEqual(f.renders, []); assert.deepEqual(f.resetCalls, []);
  });
}
test('actual session action cannot publish old-scope saved status after its operation finishes', async () => {
  const f = fixture(); f.env.operation = async () => { queueMicrotask(f.switchAccount); };
  const result = await vm.runInNewContext(writePart + '\n' + actionPart + '\nsessionAction(operation);', f.env);
  assert.equal(result, false); assert.deepEqual(f.renders, []); assert.ok(!f.messages.includes('Đã lưu buổi.'));
});
test('draft store ignores completed old generation without replacing new draft baseline or emitting saved', async () => {
  const wait = deferred(); let data = emptyData(), calls = 0;
  const store = createDraftStore({ getData: () => data, write: async change => {
    const next = structuredClone(data); change(next);
    if (++calls === 1) return wait.promise;
    data = next; return next;
  } });
  const old = store.save('planner', plannerPayload({ name: 'Old', muscles: [], equipment: [], include: [], exclude: [] }, null));
  while (!calls) await new Promise(resolve => setImmediate(resolve));
  const oldResult = emptyData(); oldResult.planningDraft.revision = 1;
  data = emptyData(); data.planningDraft.revision = 9; store.reset();
  wait.resolve(oldResult); await assert.rejects(old, /cũ|hủy/);
  assert.equal(store.status().state, 'idle');
  await store.save('planner', plannerPayload({ name: 'New', muscles: [], equipment: [], include: [], exclude: [] }, null));
  assert.equal(data.planningDraft.revision, 10); assert.equal(store.status().state, 'saved');
});
test('draft store old rejected generation cannot publish its private error into a reset workspace', async () => {
  const wait = deferred(); let entered = false; const data = emptyData();
  const store = createDraftStore({ getData: () => data, write: async () => { entered = true; return wait.promise; } });
  const old = store.save('planner', plannerPayload({ name: 'Old', muscles: [], equipment: [], include: [], exclude: [] }, null));
  while (!entered) await new Promise(resolve => setImmediate(resolve)); store.reset();
  wait.reject(Error('old-account-private-error')); await assert.rejects(old, /old-account/); assert.equal(store.status().state, 'idle');
});

test('draft callback deferred until after reset cannot mutate the new workspace data',async()=>{
 let data=emptyData(),delayed;const wait=deferred();
 const store=createDraftStore({getData:()=>data,write:change=>{delayed=change;return wait.promise;}});
 const old=store.save('planner',plannerPayload({name:'Private A',muscles:[],equipment:[],include:[],exclude:[]},null));
 while(!delayed)await new Promise(done=>setImmediate(done));
 data=emptyData();data.planningDraft.revision=9;store.reset();const before=structuredClone(data);
 assert.throws(()=>delayed(data),/cũ|hủy/);assert.deepEqual(data,before);
 wait.resolve(emptyData());await assert.rejects(old,/cũ|hủy/);assert.equal(store.status().state,'idle');
});
