import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCloudAuth, createSupabaseAuthAdapter } from '../js/cloud-auth.js';
import { CLOUD_AUTH_CONFIG } from '../js/cloud-config.js';
import { emptyData, createBackup } from '../js/data.js';

const config = { enabled:true, environment:'preview', projectUrl:'https://fixtureproject.supabase.co', publishableKey:'sb_publishable_fixture_only' };
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const email = 'synthetic@example.invalid';
function session(extra={}) { return { access_token:'private-access',refresh_token:'private-refresh',token_type:'bearer',expires_in:120,...extra }; }
function user(id=A, address=email) { return { id,email:address,email_confirmed_at:'2026-01-01T00:00:00Z',role:'authenticated',aud:'authenticated' }; }
function setup(options={}) {
  let time=1000000, nextTimer=0;
  const calls=[], replies=[], timers=new Map();
  const fetchImpl=async (url,init)=>{
    calls.push({url,init});const reply=replies.shift();
    if(!reply)throw Error('Unexpected fixture request');
    const result=typeof reply==='function'?await reply():reply;
    if(result instanceof Error)throw result;
    return {ok:result.status===undefined || result.status<400,status:result.status??200,json:async()=>result.body??result};
  };
  const adapter=createSupabaseAuthAdapter({config:options.config??config,fetchImpl,now:()=>time});
  const ctx=createCloudAuth({adapter,now:()=>time,setTimer:(fn,ms)=>{const key=++nextTimer;timers.set(key,{fn,at:time+ms});return key;},clearTimer:key=>timers.delete(key),...options});
  return {ctx,adapter,calls,replies,timers,setTime:value=>time=value,advance:async ms=>{time+=ms;const due=[...timers].filter(([,task])=>task.at<=time).sort((a,b)=>a[1].at-b[1].at);for(const [key,task]of due){if(timers.delete(key))task.fn();}await new Promise(resolve=>setImmediate(resolve));}};
}
async function login(s,id=A,address=email){s.replies.push({});await s.ctx.sendOtp(address);s.replies.push(session(),user(id,address));await s.ctx.verifyOtp('123456');}
function deferred(){let resolve;return {promise:new Promise(r=>resolve=r),resolve:value=>resolve(value)};}

test('reviewed config defaults disabled and never reaches transport',async()=>{
  assert.equal(CLOUD_AUTH_CONFIG.enabled,false);let calls=0;
  const adapter=createSupabaseAuthAdapter({config:CLOUD_AUTH_CONFIG,fetchImpl:()=>{calls++;throw Error('No network');}});
  const ctx=createCloudAuth({adapter});assert.equal(ctx.read().status,'local-only');
  assert.deepEqual(await ctx.sendOtp(email),{applied:false});assert.equal(calls,0);
});
test('configuration refuses nonexact project HTTPS origins and privileged keys',()=>{
  for(const projectUrl of ['http://fixtureproject.supabase.co','https://fixtureproject.supabase.co/path','https://evil.invalid','https://fixtureproject.supabase.co/?x=1','https://user@fixtureproject.supabase.co','https://fixtureproject.supabase.co:443'])
    assert.throws(()=>createSupabaseAuthAdapter({config:{...config,projectUrl}}));
  for(const publishableKey of ['sb_secret_private','service_role','eyJhbGciOiJIUzI1NiJ9','']) assert.throws(()=>createSupabaseAuthAdapter({config:{...config,publishableKey}}));
  assert.throws(()=>createSupabaseAuthAdapter({config:{...config,environment:'unknown'}}));
});
test('numeric OTP transport uses fixed project, create_user false and POST email verification',async()=>{
  const s=setup();await login(s);assert.equal(s.ctx.read().status,'authenticated');
  assert.deepEqual(JSON.parse(s.calls[0].init.body),{email,create_user:false});
  assert.deepEqual(JSON.parse(s.calls[1].init.body),{email,token:'123456',type:'email'});
  assert.equal(s.calls[2].url,config.projectUrl+'/auth/v1/user');assert.equal(s.calls[2].init.method,'GET');
  assert.equal(s.calls[2].init.headers.Authorization,'Bearer private-access');
  for(const call of s.calls){assert.equal(call.init.headers.apikey,config.publishableKey);assert.equal(call.init.credentials,'omit');assert.equal(call.init.cache,'no-store');assert.equal(call.init.redirect,'error');}
  assert.equal(s.ctx.read().verifiedAccountId,A);assert.equal(s.ctx.read().account.projectId,'fixtureproject');
});
test('only provider-verified UID is trusted and identity objects have provenance',async()=>{
  const s=setup();s.replies.push(session({user:{id:B}}),user());const identity=await s.adapter.verifyOtp(email,'123456');
  assert.equal(identity.uid,A);assert.equal(s.adapter.isIdentity(identity),true);assert.equal(s.adapter.isIdentity({...identity}),false);
  const other=createSupabaseAuthAdapter({config:{...config,environment:'production'},fetchImpl:()=>{throw Error('No call');}});
  assert.equal(other.isIdentity(identity),false);assert.ok(!JSON.stringify(identity).includes('private-'));
});
test('wrong project rejected by fixed-project user validation and unconfirmed/wrong-email UID rejected',async()=>{
  for(const response of [{status:401,body:{message:'private-provider-body'}},user(A,'other@example.invalid'),{...user(),email_confirmed_at:null},{...user(),is_anonymous:true},{...user(),id:'client-supplied-uid'}]){
    const s=setup();s.replies.push({});await s.ctx.sendOtp(email);s.replies.push(session(),response);await s.ctx.verifyOtp('123456');
    assert.equal(s.ctx.read().status,'error');assert.equal(s.ctx.read().verifiedAccountId,null);assert.ok(!JSON.stringify(s.ctx.read()).includes('private-provider-body'));
  }
});
test('invalid input never performs a request or changes current identity',async()=>{
  const s=setup();await s.ctx.sendOtp('not-email');assert.equal(s.calls.length,0);
  s.replies.push({});await s.ctx.sendOtp(email);await s.ctx.verifyOtp('abc123');assert.equal(s.calls.length,1);
});
test('send OTP only opens an awaiting-code challenge, never an account',async()=>{
  const s=setup(),d=deferred();s.replies.push(()=>d.promise);const p=s.ctx.sendOtp(email);
  assert.equal(s.ctx.read().status,'authenticating');assert.equal(s.ctx.read().verifiedAccountId,null);d.resolve({});await p;
  assert.equal(s.ctx.read().step,'awaiting-code');assert.throws(()=>s.ctx.capture());
});
test('logout invalidates a late OTP-send response',async()=>{
  const s=setup(),d=deferred();s.replies.push(()=>d.promise);const p=s.ctx.sendOtp(email);await s.ctx.logout();d.resolve({});
  assert.deepEqual(await p,{applied:false});assert.equal(s.ctx.read().status,'signed-out');
});
test('late verify success and failure cannot reopen identity after local-only',async()=>{
  for(const reply of [session(),new Error('private-failure')]){
    const s=setup(),d=deferred();s.replies.push({});await s.ctx.sendOtp(email);s.replies.push(()=>d.promise,user());
    const p=s.ctx.verifyOtp('123456');await s.ctx.localOnly();d.resolve(reply);assert.deepEqual(await p,{applied:false});assert.equal(s.ctx.read().status,'local-only');
  }
});
test('new OTP request invalidates an older challenge and cannot verify against old email',async()=>{
  const s=setup(),d=deferred();s.replies.push(()=>d.promise,{});const old=s.ctx.sendOtp(email);await s.ctx.sendOtp('new@example.invalid');d.resolve({});await old;
  s.replies.push(session(),user(B,'new@example.invalid'));await s.ctx.verifyOtp('123456');assert.equal(s.ctx.read().verifiedAccountId,B);
  assert.equal(JSON.parse(s.calls.at(-2).init.body).email,'new@example.invalid');
});
test('refresh revalidates the same UID with rotated credentials and rejects previous leases',async()=>{
  const s=setup();await login(s);const lease=s.ctx.capture();s.replies.push(session({access_token:'rotated',refresh_token:'rotated-refresh'}),user());
  await s.ctx.refresh();assert.equal(s.ctx.read().status,'authenticated');assert.equal(s.ctx.isCurrent(lease),false);assert.equal(lease.signal.aborted,true);
  assert.equal(s.calls.at(-2).url,config.projectUrl+'/auth/v1/token?grant_type=refresh_token');assert.deepEqual(JSON.parse(s.calls.at(-2).init.body),{refresh_token:'private-refresh'});
  assert.equal(s.calls.at(-1).init.headers.Authorization,'Bearer rotated');
});
test('failed refresh or UID change expires and seals credentials',async()=>{
  for(const responses of [[{status:401,body:{message:'private-provider-error'}}],[session(),user(B)]]){
    const s=setup();await login(s);s.replies.push(...responses);await s.ctx.refresh();assert.equal(s.ctx.read().status,'expired');assert.equal(s.ctx.read().verifiedAccountId,null);
    assert.throws(()=>s.ctx.capture());assert.ok(!JSON.stringify(s.ctx.read()).includes('private-'));
  }
});
test('auto-refresh happens before expiry; stalled refresh cannot survive the expiry deadline',async()=>{
  const s=setup();await login(s);const d=deferred();s.replies.push(()=>d.promise,user());await s.advance(60000);
  assert.equal(s.calls.at(-1).url,config.projectUrl+'/auth/v1/token?grant_type=refresh_token');await s.advance(60000);
  assert.equal(s.ctx.read().status,'expired');d.resolve(session());await new Promise(resolve=>setImmediate(resolve));assert.equal(s.ctx.read().status,'expired');
});
test('clock expiry detected synchronously before issuing an authenticated lease',async()=>{
  const s=setup();await login(s);s.setTime(1120000);assert.throws(()=>s.ctx.capture());assert.equal(s.ctx.read().status,'expired');
});
test('queued old refresh and expiry timers cannot act on a newer account',async()=>{
  const s=setup();await login(s);const oldTasks=[...s.timers.values()].map(task=>task.fn);
  s.replies.push({status:204});await s.ctx.logout();await login(s,B);const before=s.calls.length;
  for(const fn of oldTasks)fn();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.ctx.read().verifiedAccountId,B);assert.equal(s.calls.length,before);
});
test('logout seals immediately and stale revocation failure does not replace a newer account',async()=>{
  const s=setup();await login(s);const d=deferred();s.replies.push(()=>d.promise);const p=s.ctx.logout();assert.equal(s.ctx.read().status,'signed-out');
  await login(s,B);d.resolve({status:500,body:{message:'private-revocation-error'}});await p;assert.equal(s.ctx.read().verifiedAccountId,B);
  const logoutCall=s.calls.find(call=>call.url.includes('/logout'));assert.equal(logoutCall.url,config.projectUrl+'/auth/v1/logout?scope=local');
});
test('account switch seals old credentials and accepts only the newest account response',async()=>{
  const s=setup();await login(s);const old=s.ctx.capture();s.replies.push({},{});await s.ctx.switchAccount('second@example.invalid');
  assert.equal(s.ctx.isCurrent(old),false);assert.equal(s.ctx.read().status,'switching');s.replies.push(session(),user(B,'second@example.invalid'));await s.ctx.verifyOtp('123456');assert.equal(s.ctx.read().verifiedAccountId,B);
});
test('pending confirmation has opaque provenance and stale input cannot approve a transition',async()=>{
  let pending='unsaved-1';const s=setup({getPendingWork:()=>pending});const warning=await s.ctx.sendOtp(email);
  assert.equal(warning.warning,true);assert.equal(s.calls.length,0);assert.deepEqual(await s.ctx.sendOtp(email,{...warning.confirmation}),{applied:false});
  pending='unsaved-2';assert.deepEqual(await s.ctx.sendOtp(email,warning.confirmation),{applied:false});
  const fresh=await s.ctx.sendOtp(email);s.replies.push({});await s.ctx.sendOtp(email,fresh.confirmation);assert.equal(s.ctx.read().step,'awaiting-code');
});
test('pending warning cancellation and new action invalidate old confirmation',async()=>{
  const s=setup({getPendingWork:()=> 'candidate'});const w=await s.ctx.sendOtp(email);s.ctx.cancelWarning();assert.deepEqual(await s.ctx.sendOtp(email,w.confirmation),{applied:false});
  const next=await s.ctx.sendOtp(email);await s.ctx.localOnly();assert.deepEqual(await s.ctx.sendOtp(email,next.confirmation),{applied:false});
});
test('public state is detached, sanitized and contains no OTP/email/credential or remote error body',async()=>{
  const s=setup();s.ctx.subscribe(state=>{state.status='tampered';throw Error('observer');});await login(s);
  const state=s.ctx.read();state.account.uid=B;assert.equal(s.ctx.read().verifiedAccountId,A);
  const json=JSON.stringify(s.ctx.read());for(const value of [email,'123456','private-access','private-refresh'])assert.ok(!json.includes(value));
  s.replies.push({status:500,body:{message:email+' private-access'}});await s.ctx.logout();assert.ok(!JSON.stringify(s.ctx.read()).includes('private-access'));
});
test('auth preserves anonymous backup byte-for-byte and never opens native storage',async t=>{
  const anonymous=emptyData(),before=createBackup(anonymous,new Date('2026-01-01'));const saved=new Map();
  for(const key of ['localStorage','sessionStorage','indexedDB']){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('Native storage forbidden');}});}
  t.after(()=>{for(const[key,value]of saved)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
  const s=setup();await login(s);s.replies.push({status:204});await s.ctx.localOnly();assert.equal(createBackup(anonymous,new Date('2026-01-01')),before);
  const fresh=setup();assert.equal(fresh.ctx.read().status,'signed-out');assert.equal(fresh.ctx.read().verifiedAccountId,null);
});
test('cloud production modules do not import the synthetic provider or account persistence',()=>{
  for(const file of ['cloud-auth.js','cloud-auth-ui.js','cloud-config.js']){
    const source=readFileSync(new URL('../js/'+file,import.meta.url),'utf8');assert.ok(!/dev\/auth|localStorage|sessionStorage|indexedDB|\/rest\/v1|\/storage\/v1/.test(source),file);
  }
});
test('gateway transport keeps bearer private and uses only reviewed origin and current lease',async()=>{
  const s=setup({config:{...config,gatewayUrl:'https://gateway.example.invalid'}});await login(s);
  assert.equal(typeof s.ctx.gatewayCall,'function');s.replies.push({status:200,body:{status:'applied',operationId:'synthetic'}});
  const lease=s.ctx.capture();const result=await s.ctx.gatewayCall(lease,'push',{protocolVersion:1});
  assert.equal(result.status,'applied');const call=s.calls.at(-1);
  assert.equal(call.url,'https://gateway.example.invalid/push');assert.equal(call.init.headers.Authorization,'Bearer private-access');
  assert.equal(call.init.headers.apikey,undefined);assert.equal(call.init.redirect,'error');
  assert.ok(!JSON.stringify(s.ctx.read()).includes('private-access'));
  await assert.rejects(()=>s.ctx.gatewayCall(lease,'unapproved',{}));
  s.replies.push({status:204});await s.ctx.logout();await assert.rejects(()=>s.ctx.gatewayCall(lease,'pull',{}));
});
test('late gateway response after logout cannot be accepted',async()=>{
  const s=setup({config:{...config,gatewayUrl:'https://gateway.example.invalid'}});await login(s);
  assert.equal(typeof s.ctx.gatewayCall,'function');const d=deferred();s.replies.push(()=>d.promise,{status:204});
  const request=s.ctx.gatewayCall(s.ctx.capture(),'pull',{});await s.ctx.logout();d.resolve({status:200,body:{headSequence:'0'}});
  await assert.rejects(()=>request);
});
