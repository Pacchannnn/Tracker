import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudAuth, createSupabaseAuthAdapter } from '../js/cloud-auth.js';
import { emptyData, createBackup } from '../js/data.js';

const config = { enabled:true, environment:'preview', projectUrl:'https://fixtureproject.supabase.co', publishableKey:'sb_publishable_fixture_only', gatewayUrl:'https://gateway.example.invalid' };
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const email='synthetic@example.invalid', password='synthetic-private-password';
const session=()=>({access_token:'private-access',refresh_token:'private-refresh',token_type:'bearer',expires_in:120});
const user=(id=A,address=email)=>({id,email:address,email_confirmed_at:'2026-01-01',role:'authenticated',aud:'authenticated'});
function setup(options={}) {
  const replies=[], calls=[];
  const adapter=createSupabaseAuthAdapter({config:options.config??config,now:()=>1000000,fetchImpl:async(url,init)=>{
    calls.push({url,init});let reply=replies.shift();if(typeof reply==='function')reply=await reply();
    if(reply instanceof Error)throw reply;if(!reply)throw Error('No fixture response');
    return {ok:(reply.status??200)<400,status:reply.status??200,json:async()=>reply.body??reply};
  }});
  const auth=createCloudAuth({adapter,now:()=>1000000,setTimer:()=>0,clearTimer:()=>{},...options});
  return {auth,adapter,calls,replies};
}
function deferred(){let resolve;return {promise:new Promise(r=>resolve=r),resolve:value=>resolve(value)};}

test('preview password login uses hosted token endpoint and independently verifies the user',async()=>{
  const s=setup();assert.equal(s.auth.read().passwordLoginEnabled,true);
  s.replies.push({...session(),user:{id:B}},user());
  assert.deepEqual(await s.auth.loginPassword(email,password),{applied:true});
  assert.equal(s.calls[0].url,'https://fixtureproject.supabase.co/auth/v1/token?grant_type=password');
  assert.deepEqual(JSON.parse(s.calls[0].init.body),{email,password});
  assert.equal(s.calls[1].url,'https://fixtureproject.supabase.co/auth/v1/user');
  assert.equal(s.calls[1].init.headers.Authorization,'Bearer private-access');
  assert.equal(s.auth.read().verifiedAccountId,A);
  for(const call of s.calls){assert.equal(call.init.credentials,'omit');assert.equal(call.init.cache,'no-store');assert.equal(call.init.redirect,'error');assert.equal(call.init.referrerPolicy,'no-referrer');}
});

test('password capability is unavailable in production and disabled preview even via direct adapter calls',async()=>{
  for(const cfg of [{...config,environment:'production'},{...config,enabled:false}]){
    const s=setup({config:cfg});assert.equal(s.auth.read().passwordLoginEnabled,false);
    assert.deepEqual(await s.auth.loginPassword(email,password),{applied:false});
    await assert.rejects(()=>s.adapter.loginPassword(email,password));assert.equal(s.calls.length,0);
  }
});

test('password login rejects malformed, expired or unverified provider identity without exposing secrets',async()=>{
  for(const replies of [[{status:401,body:{message:password}}],[session(),{...user(),email:'other@example.invalid'}],[session(),{...user(),email_confirmed_at:null}],[session(),{...user(),role:'service_role'}],[session(),{...user(),aud:'other'}],[session(),{...user(),id:'client-id'}],[session(),{...user(),is_anonymous:true}],[{...session(),expires_at:999},user()],[{...session(),refresh_token:''}]]){
    const s=setup();s.replies.push(...replies);assert.deepEqual(await s.auth.loginPassword(email,password),{applied:false});
    assert.equal(s.auth.read().status,'error');assert.equal(s.auth.read().verifiedAccountId,null);assert.throws(()=>s.auth.capture());
    assert.ok(!JSON.stringify(s.auth.read()).includes(password));
  }
});

test('invalid password input leaves existing account and transport untouched',async()=>{
  const s=setup();for(const value of ['',null,{},'x'.repeat(4097)])assert.deepEqual(await s.auth.loginPassword(email,value),{applied:false});
  assert.deepEqual(await s.auth.loginPassword('not-email',password),{applied:false});assert.equal(s.calls.length,0);
  s.replies.push(session(),user());await s.auth.loginPassword(email,password);const lease=s.auth.capture(),before=s.calls.length;
  assert.deepEqual(await s.auth.loginPassword('second@example.invalid',password),{applied:false});
  assert.equal(s.auth.isCurrent(lease),true);assert.equal(s.calls.length,before);
});

test('late password success or failure cannot reopen a canceled session',async()=>{
  for(const action of ['logout','localOnly','cancelLogin'])for(const reply of [session(),Error(password)]){
    const s=setup(),d=deferred();s.replies.push(()=>d.promise,user());const operation=s.auth.loginPassword(email,password);
    assert.equal(s.auth.read().step,'verifying');await s.auth[action]();d.resolve(reply);
    assert.deepEqual(await operation,{applied:false});assert.equal(s.auth.read().verifiedAccountId,null);
  }
});

test('password switch seals old account lease immediately and uses only verified second account',async()=>{
  const s=setup();s.replies.push(session(),user());await s.auth.loginPassword(email,password);const lease=s.auth.capture();
  const d=deferred();s.replies.push({status:204},()=>d.promise,user(B,'second@example.invalid'));
  const switching=s.auth.switchAccountPassword('second@example.invalid',password);
  assert.equal(s.auth.isCurrent(lease),false);assert.equal(lease.signal.aborted,true);assert.equal(s.auth.read().verifiedAccountId,null);
  d.resolve(session());await switching;assert.equal(s.auth.read().verifiedAccountId,B);
  await assert.rejects(()=>s.auth.gatewayCall(lease,'pull',{}));
});

test('pending confirmation binds password transition to action, email, epoch and unchanged pending work',async()=>{
  let pending='draft-1';const s=setup({getPendingWork:()=>pending});const first=await s.auth.loginPassword(email,password);
  assert.equal(first.warning,true);assert.equal(s.calls.length,0);assert.ok(!JSON.stringify(first).includes(password));
  assert.deepEqual(await s.auth.loginPassword('other@example.invalid',password,first.confirmation),{applied:false});
  const changed=await s.auth.loginPassword(email,password);pending='draft-2';assert.deepEqual(await s.auth.loginPassword(email,password,changed.confirmation),{applied:false});
  const canceled=await s.auth.loginPassword(email,password);s.auth.cancelWarning();assert.deepEqual(await s.auth.loginPassword(email,password,canceled.confirmation),{applied:false});
  const fresh=await s.auth.loginPassword(email,password);s.replies.push(session(),user());
  assert.deepEqual(await s.auth.loginPassword(email,password,fresh.confirmation),{applied:true});assert.equal(s.auth.read().verifiedAccountId,A);
});

test('password, provider credentials and email never enter read state or anonymous persistence/export',async t=>{
  const data=emptyData(),before=createBackup(data,new Date('2026-01-01')),saved=new Map();
  for(const key of ['localStorage','sessionStorage','indexedDB']){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('Storage forbidden');}});}
  t.after(()=>{for(const [key,value]of saved)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
  const s=setup(),states=[];s.auth.subscribe(state=>states.push(state));s.replies.push(session(),user());await s.auth.loginPassword(email,password);
  for(const value of [password,email,'private-access','private-refresh'])assert.ok(!JSON.stringify([s.auth.read(),states]).includes(value));
  assert.equal(createBackup(data,new Date('2026-01-01')),before);s.replies.push({status:204});await s.auth.logout();
  const fresh=setup();assert.equal(fresh.auth.read().status,'signed-out');assert.equal(fresh.auth.read().verifiedAccountId,null);
});
