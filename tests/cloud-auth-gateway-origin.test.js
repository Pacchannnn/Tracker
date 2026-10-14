import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudAuth,createSupabaseAuthAdapter} from '../js/cloud-auth.js';

const gatewayUrl='https://preview.example.invalid';
const config={enabled:true,environment:'preview',projectUrl:'https://fixtureproject.supabase.co',publishableKey:'sb_publishable_fixture',gatewayUrl};
const email='synthetic@example.invalid';
async function setup(options={}){
  const calls=[],replies=[{access_token:'private-access',refresh_token:'private-refresh',token_type:'bearer',expires_in:120},{id:'11111111-1111-4111-8111-111111111111',email,email_confirmed_at:'2026-01-01',role:'authenticated',aud:'authenticated'},{headSequence:'0'}];
  const adapter=createSupabaseAuthAdapter({config,now:()=>1000000,...options,fetchImpl:async(url,init)=>{calls.push({url,init});return {ok:true,status:200,json:async()=>replies.shift()};}});
  const auth=createCloudAuth({adapter,now:()=>1000000,setTimer:()=>0,clearTimer:()=>{}});
  assert.deepEqual(await auth.loginPassword(email,'synthetic-password'),{applied:true});
  const result=await auth.gatewayCall(auth.capture(),'pull',{});assert.equal(result.headSequence,'0');
  return {calls,auth};
}

test('exact trusted page origin permits protected gateway cookies while Supabase authentication omits them',async()=>{
  const s=await setup({pageOrigin:'https://preview.example.invalid'});
  assert.equal(s.calls[2].url,'https://preview.example.invalid/pull');assert.equal(s.calls[2].init.credentials,'same-origin');
  assert.equal(s.calls[0].init.credentials,'omit');assert.equal(s.calls[1].init.credentials,'omit');
  assert.equal(s.calls[2].init.headers.Authorization,'Bearer private-access');assert.equal(s.calls[2].init.headers.Cookie,undefined);
  assert.equal(s.calls[2].init.redirect,'error');assert.equal(s.calls[2].init.referrerPolicy,'no-referrer');
  assert.ok(!JSON.stringify(s.auth.read()).includes('private-access'));
});

test('cross-host, subdomain, protocol, port and non-origin lookalikes never permit gateway cookies',async()=>{
  for(const pageOrigin of ['', 'https://other.example.invalid', 'https://child.preview.example.invalid', 'http://preview.example.invalid', 'https://preview.example.invalid:444', 'https://preview.example.invalid/', 'https://preview.example.invalid@evil.invalid']){
    const s=await setup({pageOrigin});for(const call of s.calls)assert.equal(call.init.credentials,'omit',pageOrigin);
  }
});

test('browser page origin is used by default without reading cookie values',async t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'location'),savedDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://preview.example.invalid'}});
  Object.defineProperty(globalThis,'document',{configurable:true,get(){throw Error('Cookie access forbidden');}});
  t.after(()=>{for(const [key,value]of [['location',original],['document',savedDocument]])value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
  const s=await setup();assert.equal(s.calls[2].init.credentials,'same-origin');
  assert.equal(s.calls[0].init.credentials,'omit');assert.equal(s.calls[1].init.credentials,'omit');
});
