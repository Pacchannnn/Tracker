import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseAuthAdapter,createCloudAuth} from '../js/cloud-auth.js';
const uid='11111111-1111-4111-8111-111111111111', manifest='22222222-2222-4222-8222-222222222222';
const config={enabled:true,environment:'preview',projectUrl:'https://synthetic.supabase.co',publishableKey:'sb_publishable_SYNTHETIC',gatewayUrl:'https://gateway.synthetic.invalid'};
const path=`synthetic/preview/${uid}/${manifest}/original.jpg`;
function setup(){let calls=[];const adapter=createSupabaseAuthAdapter({config,fetchImpl:async(url,init)=>{
 calls.push({url,init});
 if(url.includes('/auth/v1/verify'))return Response.json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600});
 if(url.includes('/auth/v1/user'))return Response.json({id:uid,role:'authenticated',aud:'authenticated',email:'a@example.invalid',email_confirmed_at:'2026-10-11T00:00:00Z'});
 return new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}});
}});return{adapter,calls};}
test('storage upload stays on fixed project, exact verified UID namespace, immutable POST and memory-only bearer',async()=>{
 const s=setup(),identity=await s.adapter.verifyOtp('a@example.invalid','123456');
 const blob=new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'});
 await s.adapter.callStorage(identity,{method:'POST',path,blob});
 const call=s.calls.at(-1);assert.equal(call.url,config.projectUrl+'/storage/v1/object/tracker-preview-photos/'+path);assert.equal(call.init.method,'POST');assert.equal(call.init.headers['x-upsert'],'false');assert.equal(call.init.body,blob);assert.equal(call.init.headers.Authorization,'Bearer synthetic-access');assert.equal(call.init.cache,'no-store');assert.equal(call.init.credentials,'omit');assert.ok(!JSON.stringify(identity).includes('synthetic-access'));
});
test('storage transport rejects cross-account/project, traversal, remote URL and UPDATE/DELETE before network',async()=>{
 const s=setup(),identity=await s.adapter.verifyOtp('a@example.invalid','123456'),count=s.calls.length;
 for(const invalid of [{method:'DELETE',path},{method:'PUT',path},{method:'GET',path:path.replace(uid,manifest)},{method:'GET',path:path.replace('synthetic/','other/')},{method:'GET',path:path.replace('/original.jpg','/../original.jpg')},{method:'GET',path:'https://evil.invalid/image.jpg'}])await assert.rejects(()=>s.adapter.callStorage(identity,invalid));
 assert.equal(s.calls.length,count);
});
test('private download returns bounded JPEG Blob; sealed credentials cannot read bytes',async()=>{
 const s=setup(),identity=await s.adapter.verifyOtp('a@example.invalid','123456');
 const blob=await s.adapter.callStorage(identity,{method:'GET',path});assert.equal(blob.type,'image/jpeg');assert.equal(blob.size,4);
 s.adapter.seal(identity);await assert.rejects(()=>s.adapter.callStorage(identity,{method:'GET',path}));
});
test('cloud lease rejects storage responses after logout and never exposes token through status',async()=>{
 let finish;const adapter={kind:'supabase',enabled:true,environment:'preview',projectId:'synthetic',beginLogin:async()=>{},verifyOtp:async()=>({uid,environment:'preview',projectId:'synthetic',assurance:'verified',expiresAt:Date.now()+3600000}),isIdentity:()=>true,seal(){},logout:async()=>{},callStorage:()=>new Promise(resolve=>finish=resolve)};
 const auth=createCloudAuth({adapter,setTimer:()=>0,clearTimer:()=>{}});await auth.sendOtp('a@example.invalid');await auth.verifyOtp('123456');
 const pending=auth.storageCall(auth.capture(),{method:'GET',path});await auth.logout();finish(new Blob(['synthetic']));await assert.rejects(pending);assert.equal(auth.read().account,null);
});
