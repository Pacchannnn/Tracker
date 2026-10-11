import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as serverModule from '../cloud/server.js';
import {createGateway} from '../cloud/gateway.js';

const uid='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_PROJECT_URL:'https://syntheticpreview.supabase.co',TRACKER_ENVIRONMENT:'preview',TRACKER_ALLOWED_ORIGIN:'https://tracker.example.invalid'};
test('preview write policy stays off by default and requires exact project and reviewed account IDs',()=>{
  assert.equal(typeof serverModule.previewWritePolicy,'function');
  assert.deepEqual(serverModule.previewWritePolicy(env),{enabled:false,allowedUids:[]});
  const approved={...env,TRACKER_ENABLE_PREVIEW_WRITES:'true',TRACKER_WRITE_PROJECT_REF:'syntheticpreview',TRACKER_WRITE_USER_IDS:uid+','+other};
  assert.deepEqual(serverModule.previewWritePolicy(approved),{enabled:true,allowedUids:[uid,other]});
  for(const patch of [{TRACKER_ENVIRONMENT:'production'},{TRACKER_WRITE_PROJECT_REF:'different'},{TRACKER_WRITE_USER_IDS:''},{TRACKER_WRITE_USER_IDS:uid+','+uid},{TRACKER_WRITE_USER_IDS:'bad'},{TRACKER_ALLOWED_ORIGIN:''},{TRACKER_ENABLE_PREVIEW_WRITES:'yes'}]) assert.throws(()=>serverModule.previewWritePolicy({...approved,...patch}));
});
test('preview account write allowlist rejects before database calls without weakening Auth',async()=>{
  let verified=0,calls=0;
  const gateway=createGateway({environment:'preview',projectId:'synthetic',allowWrites:true,allowedWriteUids:[uid],verifyIdentity:async()=>{verified++;return {uid:other};},store:{lookupReceipt(){calls++;throw Error('unexpected SQL');}}});
  const result=await gateway.handle({route:'push',authorization:'synthetic',body:{}});
  assert.equal(result.code,'write_account_not_approved'); assert.equal(verified,1);assert.equal(calls,0);
});
test('gateway rate bound refuses excess requests before Auth while health remains live and accurately reports writes',async t=>{
  let calls=0,time=0;
  const server=serverModule.createHttpServer({async handle(){calls++;return {status:'error',code:'unauthorized'};}},{writesEnabled:true,requestLimit:2,now:()=>time});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}`;
  const send=()=>fetch(url+'/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal((await send()).status,401);assert.equal((await send()).status,401);
  const denied=await send();assert.equal(denied.status,429);assert.equal(denied.headers.get('retry-after'),'60');assert.equal(calls,2);
  const health=await fetch(url+'/health');assert.deepEqual(await health.json(),{status:'ok',writesEnabled:true});
  time=60000;assert.equal((await send()).status,401);assert.equal(calls,3);
});
test('HTTP work is aborted promptly after socket disconnect instead of waiting for upstream',async t=>{
  let entered;const entry=new Promise(resolve=>entered=resolve);let cancelled;
  const cancel=new Promise(resolve=>cancelled=resolve);
  let observedSignal;
  const server=serverModule.createHttpServer({handle(request){observedSignal=request.signal;entered();if(!request.signal)return Promise.resolve({status:'error',code:'missing_signal'});return new Promise(resolve=>request.signal.addEventListener('abort',()=>{cancelled();resolve({status:'error',code:'aborted'});},{once:true}));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/pull',method:'POST',headers:{'Content-Type':'application/json'}},res=>res.resume());req.on('error',()=>{});req.end('{}');
  await entry;req.destroy();assert.ok(observedSignal instanceof AbortSignal);await Promise.race([cancel,new Promise((_,reject)=>setTimeout(()=>reject(Error('disconnect did not abort handler')),500))]);
});
