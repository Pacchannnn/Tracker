import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createAuthContext } from '../dev/auth/auth-context.js';
import { createMockProvider, createMockWorkspaces } from '../dev/auth/mock-provider.js';
import { emptyData, createBackup, parseBackup } from '../js/data.js';

function setup(options = {}) {
  const adapter = createMockProvider(), workspaces = options.workspaces || createMockWorkspaces();
  const revoked = [];
  const ctx = createAuthContext({ environment:'preview', projectId:'mock-project', deviceId:'mock-device', adapter, workspaces, revokeURL:url=>revoked.push(url), ...options });
  return {ctx,adapter,workspaces,revoked};
}
async function login(s,uid='A') { const p=s.ctx.login(uid); s.adapter.resolveNext(); await p; return s.ctx.capture(); }

test('initial local-only state cannot open an account and contains no verified identity',()=>{
  const {ctx}=setup(); assert.equal(ctx.read().status,'local-only'); assert.equal(ctx.read().verifiedAccountId,null);
  assert.equal(ctx.read().activeWorkspace,null); assert.throws(()=>ctx.capture()); assert.throws(()=>ctx.refresh({},{}));
});
test('login pending has no workspace; issued matching identity confirms synthetic account',async()=>{
  const s=setup(), changes=[]; const unsub=s.ctx.subscribe(x=>changes.push(x.status));
  const p=s.ctx.login('A'); assert.equal(s.ctx.read().status,'authenticating'); assert.throws(()=>s.ctx.capture());
  s.adapter.resolveNext(); await p; assert.equal(s.ctx.read().status,'authenticated');
  assert.equal(s.ctx.read().account.assurance,'synthetic'); assert.equal(s.ctx.read().verifiedAccountId,null);
  unsub(); s.ctx.logout(); assert.deepEqual(changes,['authenticating','authenticated']);
});
test('wrong UID/environment/project and unissued or production identity cannot confirm',async()=>{
  for(const patch of [{uid:'B'},{environment:'production'},{projectId:'wrong'},{assurance:'verified'}]){
    const s=setup(), p=s.ctx.login('A'); s.adapter.resolveNext(patch); await p;
    assert.equal(s.ctx.read().status,'error'); assert.equal(s.ctx.read().activeWorkspace,null);
  }
  const s=setup(), p=s.ctx.login('A'); const request=s.adapter.requests()[0];
  assert.throws(()=>s.ctx.confirmIdentity(request.lease,{uid:'A',assurance:'synthetic'}));
  s.adapter.resolveNext(); await p;
  assert.throws(()=>createAuthContext({environment:'production',projectId:'real',deviceId:'x',adapter:{kind:'supabase'},workspaces:s.workspaces}));
});
test('A→B→A isolation preserves candidates, warns pending, and invalidates old leases',async()=>{
  const s=setup(), a=await login(s); s.ctx.writeWorkspace(a,{text:'A candidate',pending:true});
  const warning=s.ctx.switchAccount('B'); assert.equal(warning.warning,true); assert.equal(s.ctx.read().account.uid,'A');
  const p=s.ctx.switchAccount('B',warning.confirmation); assert.equal(s.ctx.read().status,'switching');
  assert.throws(()=>s.ctx.readWorkspace(a)); s.adapter.resolveNext(); await p;
  const b=s.ctx.capture(); assert.deepEqual(s.ctx.readWorkspace(b),{text:'',pending:false});
  s.ctx.writeWorkspace(b,{text:'B candidate',pending:false}); const p2=s.ctx.switchAccount('A'); s.adapter.resolveNext(); await p2;
  assert.equal(s.ctx.readWorkspace(s.ctx.capture()).text,'A candidate'); assert.throws(()=>s.ctx.writeWorkspace(a,{text:'late',pending:false}));
});
test('same email metadata does not collapse different UIDs',async()=>{
  const s=setup(); const p=s.ctx.login('A');s.adapter.resolveNext({email:'shared@example.invalid'});await p;
  s.ctx.writeWorkspace(s.ctx.capture(),{text:'A',pending:false});const q=s.ctx.switchAccount('B');s.adapter.resolveNext({email:'shared@example.invalid'});await q;
  assert.equal(s.ctx.read().account.uid,'B');assert.equal(s.ctx.readWorkspace(s.ctx.capture()).text,'');assert.ok(!JSON.stringify(s.ctx.read()).includes('email'));
});
test('pending warning cancel/invalid/stale confirmation cannot perform transition',async()=>{
  const s=setup(),lease=await login(s);s.ctx.writeWorkspace(lease,{text:'pending',pending:true});
  const w=s.ctx.logout();s.ctx.cancelWarning();assert.throws(()=>s.ctx.logout(w.confirmation));
  const w2=s.ctx.logout();s.ctx.writeWorkspace(lease,{text:'new pending',pending:true});assert.throws(()=>s.ctx.logout(w2.confirmation));
  assert.equal(s.ctx.read().status,'authenticated');const w3=s.ctx.logout();s.ctx.logout(w3.confirmation);
  assert.equal(s.ctx.read().status,'signed-out');await login(s);assert.equal(s.ctx.readWorkspace(s.ctx.capture()).text,'new pending');
});
test('expiry seals and preserves pending work; stale operation cannot enter B or resumed A',async()=>{
  const s=setup(),lease=await login(s);s.ctx.writeWorkspace(lease,{text:'keep',pending:true});let resolve;
  const operation=s.ctx.run(lease,()=>new Promise(r=>resolve=r));s.ctx.expire(lease);assert.equal(s.ctx.read().status,'expired');
  assert.equal(lease.signal.aborted,true);assert.throws(()=>s.ctx.readWorkspace(lease));assert.equal(s.ctx.read().pendingWork,true);
  const w=s.ctx.switchAccount('B'),p=s.ctx.switchAccount('B',w.confirmation);s.adapter.resolveNext();await p;
  resolve({text:'stale',pending:false});assert.deepEqual(await operation,{applied:false});assert.equal(s.ctx.readWorkspace(s.ctx.capture()).text,'');
});
test('logout during pending login rejects late response and never reopens workspace',async()=>{
  const s=setup(),p=s.ctx.login('A');s.ctx.logout();s.adapter.resolveNext();assert.deepEqual(await p,{applied:false});
  assert.equal(s.ctx.read().status,'signed-out');assert.equal(s.ctx.read().activeWorkspace,null);
});
test('pending async operation warns before logout even without a preexisting draft',async()=>{
  const s=setup(),lease=await login(s);let resolve;
  const p=s.ctx.run(lease,()=>new Promise(r=>resolve=r));
  const warning=s.ctx.logout();assert.equal(warning.warning,true);s.ctx.logout(warning.confirmation);
  resolve({text:'late operation',pending:false});assert.deepEqual(await p,{applied:false});
});
test('rapid login/logout/login only accepts newest response',async()=>{
  const s=setup(),old=s.ctx.login('A');s.ctx.logout();const next=s.ctx.login('B');
  s.adapter.resolveNext();await old;assert.equal(s.ctx.read().status,'authenticating');s.adapter.resolveNext();await next;assert.equal(s.ctx.read().account.uid,'B');
  assert.throws(()=>s.ctx.login('A'));assert.throws(()=>s.ctx.switchAccount('B'));
});
test('provider failure sanitized; stale failure cannot change newer state',async()=>{
  const s=setup(),p=s.ctx.login('A');s.adapter.rejectNext(new Error('PRIVATE SYNTHETIC TOKEN'));await p;
  assert.equal(s.ctx.read().status,'error');assert.ok(!JSON.stringify(s.ctx.read()).includes('PRIVATE'));assert.throws(()=>s.ctx.capture());
  const stale=s.ctx.login('A');s.ctx.logout();const next=s.ctx.login('B');s.adapter.rejectNext(new Error('old'));await stale;
  s.adapter.resolveNext();await next;assert.equal(s.ctx.read().account.uid,'B');
});
test('refresh requires same issued identity; invalid refresh seals with error',async()=>{
  const s=setup(),lease=await login(s),id=s.adapter.issue({environment:'preview',projectId:'mock-project',uid:'A',assurance:'synthetic'});
  s.ctx.refresh(lease,id);assert.equal(s.ctx.read().status,'authenticated');assert.throws(()=>s.ctx.readWorkspace(lease));
  const current=s.ctx.capture();assert.throws(()=>s.ctx.refresh(current,s.adapter.issue({...id,uid:'B'})));assert.equal(s.ctx.read().status,'error');
});
test('failed refresh cannot bypass pending-warning gate through another login',async()=>{
  const s=setup(),lease=await login(s);s.ctx.writeWorkspace(lease,{text:'keep after error',pending:true});
  assert.throws(()=>s.ctx.refresh(lease,s.adapter.issue({uid:'B'})));assert.throws(()=>s.ctx.login('B'));
  const w=s.ctx.switchAccount('B');assert.equal(w.warning,true);
});
test('delayed operation cannot overwrite a newer candidate in the same account',async()=>{
  const s=setup(),lease=await login(s);let resolve;const p=s.ctx.run(lease,()=>new Promise(r=>resolve=r));
  s.ctx.writeWorkspace(lease,{text:'newer input',pending:true});resolve({text:'old result',pending:false});
  assert.deepEqual(await p,{applied:false});assert.equal(s.ctx.readWorkspace(lease).text,'newer input');
});
test('no native storage/network access or write to existing anonymous workspace',async t=>{
  const descriptors=new Map(),access=[];
  for(const key of ['localStorage','sessionStorage','indexedDB','fetch']){
    descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,get(){access.push(key);throw Error('Forbidden native access');}});
  }
  t.after(()=>{for(const [key,value] of descriptors)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
  const s=setup();await login(s);s.ctx.writeWorkspace(s.ctx.capture(),{text:'synthetic',pending:false});s.ctx.logout();assert.deepEqual(access,[]);
});
test('guarded operation writes only within current account; forged lease fails closed',async()=>{
  const s=setup(),lease=await login(s);assert.throws(()=>s.ctx.readWorkspace({...lease}));
  assert.deepEqual(await s.ctx.run(lease,async()=>({text:'result',pending:true})),{applied:true});
  assert.equal(s.ctx.readWorkspace(lease).text,'result');assert.throws(()=>s.ctx.writeWorkspace(lease,{text:'bad',pending:'yes'}));
});
test('registered temporary URLs revoked on context changes; stale registration blocked',async()=>{
  const s=setup(),lease=await login(s);s.ctx.registerURL(lease,'blob:synthetic');s.ctx.logout();assert.deepEqual(s.revoked,['blob:synthetic']);
  assert.throws(()=>s.ctx.registerURL(lease,'blob:late'));assert.equal(lease.signal.aborted,true);
});
test('environment/project/device keys keep identical UID workspace separate',async()=>{
  const workspaces=createMockWorkspaces();const a=setup({workspaces}),b=setup({workspaces,environment:'production'}),c=setup({workspaces,projectId:'other'}),d=setup({workspaces,deviceId:'other'});
  a.ctx.writeWorkspace(await login(a),{text:'preview only',pending:false});
  for(const s of [b,c,d])assert.equal(s.ctx.readWorkspace(await login(s)).text,'');
});
test('snapshots and read candidates detached; subscribers cannot corrupt state',async()=>{
  const s=setup();s.ctx.subscribe(x=>{x.status='bad';throw Error('listener');});await login(s);
  const state=s.ctx.read();state.account.uid='B';assert.equal(s.ctx.read().account.uid,'A');
  const candidate=s.ctx.readWorkspace(s.ctx.capture());candidate.text='changed';assert.equal(s.ctx.readWorkspace(s.ctx.capture()).text,'');
});
test('return local-only preserves candidates; new harness has no trusted persisted session',async()=>{
  const s=setup();s.ctx.writeWorkspace(await login(s),{text:'keep',pending:false});s.ctx.localOnly();assert.equal(s.ctx.read().status,'local-only');
  await login(s);assert.equal(s.ctx.readWorkspace(s.ctx.capture()).text,'keep');const fresh=setup();assert.equal(fresh.ctx.read().status,'local-only');
});
test('auth operations do not change anonymous JSON or portable backup schema',async()=>{
  const anonymous=emptyData(),before=createBackup(anonymous),s=setup();await login(s);s.ctx.logout();
  assert.equal(createBackup(anonymous,new Date(JSON.parse(before).exportedAt)),before);assert.deepEqual(parseBackup(before).data,anonymous);
  assert.ok(!/token|verifiedAccountId|mock-project/.test(before));
});
test('harness source cannot touch Tracker storage/network and does not enter allowlist',()=>{
  for(const file of readdirSync(new URL('../dev/auth/',import.meta.url)).filter(x=>x.endsWith('.js'))){
    const text=readFileSync(new URL('../dev/auth/'+file,import.meta.url),'utf8');assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\s*\(|WebSocket|https?:\/\//.test(text),file);
  }
  const packager=readFileSync(new URL('../scripts/static-package.js',import.meta.url),'utf8');assert.ok(!packager.includes("'dev/auth/"));
});
