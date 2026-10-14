import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable,Writable} from 'node:stream';
import {createHash} from 'node:crypto';
import http from 'node:http';
import * as server from '../cloud/server.js';
const adapter=await import('../cloud/vercel.js').catch(()=>({}));
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const env={VERCEL_ENV:'preview',TRACKER_ENVIRONMENT:'preview',TRACKER_ALLOWED_ORIGIN:'https://tracker.example.invalid',SUPABASE_PROJECT_URL:'https://syntheticpreview.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',DATABASE_URL:'postgresql://synthetic@localhost/db?sslmode=verify-full'};
const token=(id=uid)=>'h.'+Buffer.from(JSON.stringify({iss:env.SUPABASE_PROJECT_URL+'/auth/v1',aud:'authenticated',exp:4102444800,sub:id})).toString('base64url')+'.s';
const headers={'content-type':'application/json',origin:env.TRACKER_ALLOWED_ORIGIN,authorization:'Bearer '+token()};
function request({url='/pull',method='POST',body={},raw,extraHeaders={},bodyGetter}={}) {
  const req=Readable.from([Buffer.from(raw===undefined?JSON.stringify(body):raw)]);
  Object.assign(req,{url,method,headers:{...headers,...extraHeaders}});
  if(bodyGetter)Object.defineProperty(req,'body',{get:bodyGetter});return req;
}
async function send(handler,options) {
  const chunks=[];const res=new Writable({write(chunk,encoding,callback){chunks.push(Buffer.from(chunk));callback();}});
  Object.assign(res,{headersSent:false,writeHead(code,headers){this.code=code;this.headers=headers;this.headersSent=true;options?.onWriteHead?.(code);}});
  await handler(request(options),res);const bytes=Buffer.concat(chunks);return {code:res.code,headers:res.headers,body:bytes.length?JSON.parse(bytes.toString('utf8')):null};
}
function runtime(overrides={}) {
  assert.equal(typeof adapter.createVercelHandler,'function','Vercel handler missing');
  const queries=[],state={pools:0,ends:0,auth:0,options:null};
  class Pool {constructor(options){state.pools++;state.options=options;}on(){}async end(){state.ends++;}async query(sql,params){queries.push({sql,params});return /pg_catalog.pg_roles/.test(sql)?{rows:[{permitted:overrides.permitted??true}]}:{rows:[{result:overrides.result??{status:'ok'}}]};}}
  const handler=adapter.createVercelHandler({env:{...env,...overrides.env},loadPg:async()=>({Pool}),fetchImpl:async(url,options)=>{
    assert.equal(options.redirect,'error');
    if(url.includes('/storage/')) {assert.ok(url.startsWith(env.SUPABASE_PROJECT_URL+'/storage/v1/object/authenticated/tracker-preview-photos/'));assert.equal(options.headers.Authorization,headers.authorization);return new Response(overrides.photo,{headers:{'Content-Type':'image/jpeg','Content-Length':String(overrides.photo.length)}});}
    state.auth++;assert.equal(url,env.SUPABASE_PROJECT_URL+'/auth/v1/user');return {ok:true,json:async()=>({id:overrides.uid??uid,role:'authenticated',aud:'authenticated',email_confirmed_at:'synthetic'})};
  }});
  return {handler,state,queries};
}
test('shared HTTP handler is reusable without listening or creating a server',()=>{
  assert.equal(typeof server.createHttpHandler,'function');
});
test('canonical preview origin comes only from an exact trusted Vercel preview hostname',()=>{
  assert.equal(typeof adapter.previewOrigin,'function');
  assert.equal(adapter.previewOrigin({VERCEL_ENV:'preview',VERCEL_URL:'tracker-preview-abc123.vercel.app'}),'https://tracker-preview-abc123.vercel.app');
  for(const VERCEL_URL of ['', 'https://tracker-preview.vercel.app','tracker-preview.vercel.app/path','tracker-preview.vercel.app:443','evil.example.com','TRACKER.vercel.app','*.vercel.app','user@tracker.vercel.app','tracker.vercel.app.evil.invalid','tracker..vercel.app','-tracker.vercel.app'])assert.throws(()=>adapter.previewOrigin({VERCEL_ENV:'preview',VERCEL_URL}));
  assert.throws(()=>adapter.previewOrigin({VERCEL_ENV:'production',VERCEL_URL:'tracker.vercel.app'}));
});
test('runtime falls back to its canonical preview origin and derives the write policy from that origin',async()=>{
  const canonical='https://tracker-preview-abc123.vercel.app';
  const config={TRACKER_ALLOWED_ORIGIN:'',VERCEL_URL:canonical.slice(8),TRACKER_ENABLE_PREVIEW_WRITES:'true',TRACKER_WRITE_PROJECT_REF:'syntheticpreview',TRACKER_WRITE_USER_IDS:uid};
  const {handler}=runtime({env:config});const health=await send(handler,{url:'/health',method:'GET',extraHeaders:{origin:canonical}});assert.equal(health.code,200);assert.equal(health.body.writesEnabled,true);assert.equal(health.headers['Access-Control-Allow-Origin'],canonical);
  assert.equal((await send(handler,{url:'/health',method:'GET'})).code,403);
  const explicit=runtime({env:{VERCEL_URL:'invalid.host'}});assert.equal((await send(explicit.handler,{url:'/health',method:'GET'})).code,200);
});
test('Vercel raw body is parsed exactly once without touching the platform parsed getter',async()=>{
  assert.equal(typeof adapter.readVercelBody,'function');
  const expected={synthetic:'é'},text=JSON.stringify(expected);
  assert.deepEqual(await adapter.readVercelBody(request({raw:text,bodyGetter(){throw Error('parsed getter must remain unused');}})),expected);
  assert.equal(await adapter.readVercelBody(request({raw:JSON.stringify(text),bodyGetter(){return text;}})),text);
  for(const req of [request({raw:'invalid'}),request({raw:''})]) await assert.rejects(()=>adapter.readVercelBody(req),/invalid_json/);
});
test('raw body limit counts UTF8 bytes and JSON whitespace even without Content-Length',async()=>{
  assert.equal(typeof adapter.readVercelBody,'function');
  await assert.rejects(()=>adapter.readVercelBody(request({body:{value:'é'.repeat(1048576)}})),/payload_too_large/);
  await assert.rejects(()=>adapter.readVercelBody(request({raw:'x'.repeat(2097153)})),/payload_too_large/);
  await assert.rejects(()=>adapter.readVercelBody(request({raw:' '.repeat(2097152)+'{}',bodyGetter(){return {};}})),/payload_too_large/);
  let accessed=false;
  await assert.rejects(()=>adapter.readVercelBody(request({extraHeaders:{'content-length':'2097153'},bodyGetter(){accessed=true;return {};}})),/payload_too_large/);assert.equal(accessed,false);
});
test('failed concurrent initialization closes its pool and retries one fresh verified role check',async()=>{
  let pools=0,ends=0,roleChecks=0;
  class Pool {constructor(options){pools++;assert.equal(options.connectionString,env.DATABASE_URL);}on(){}async end(){ends++;}async query(sql){assert.match(sql,/rolbypassrls/);roleChecks++;if(roleChecks===1)throw Error('synthetic transient database timeout');return {rows:[{permitted:true}]};}}
  const handler=adapter.createVercelHandler({env,loadPg:async()=>({Pool})});
  const failed=await Promise.all([send(handler,{url:'/health',method:'GET'}),send(handler,{url:'/health',method:'GET'})]);for(const response of failed)assert.equal(response.code,503);
  assert.equal(pools,1);assert.equal(ends,1);
  assert.equal((await send(handler,{url:'/health',method:'GET'})).code,200);assert.equal(pools,2);assert.equal(roleChecks,2);
  assert.equal((await send(handler,{url:'/health',method:'GET'})).code,200);assert.equal(pools,2);
});
test('a late waiter on a failed startup cannot clear a newer successful initialization',async()=>{
  let pools=0,checks=0,retry;
  class Pool {constructor(){pools++;}on(){}async end(){}async query(){if(++checks===1)throw Error('synthetic transient timeout');return {rows:[{permitted:true}]};}}
  const handler=adapter.createVercelHandler({env,loadPg:async()=>({Pool})});
  const first=send(handler,{url:'/health',method:'GET',onWriteHead(code){if(code===503)retry=send(handler,{url:'/health',method:'GET'});}});
  const oldWaiter=send(handler,{url:'/health',method:'GET'});
  assert.equal((await first).code,503);assert.equal((await oldWaiter).code,503);assert.equal((await retry).code,200);
  assert.equal((await send(handler,{url:'/health',method:'GET'})).code,200);assert.equal(pools,2);assert.equal(checks,2);
});
test('cancellation during initialization closes the response and skips request work after role check',async()=>{
  let entered,complete;const atRoleCheck=new Promise(resolve=>entered=resolve),ready=new Promise(resolve=>complete=resolve);let auth=0;
  class Pool {on(){}async end(){}async query(){entered();await ready;return {rows:[{permitted:true}]};}}
  const handler=adapter.createVercelHandler({env,loadPg:async()=>({Pool}),fetchImpl:async()=>{auth++;assert.fail('cancelled request reached Auth');}});
  const req=request(),response=new Writable({write(chunk,encoding,callback){callback();}});let headersSent=false;response.writeHead=()=>{headersSent=true;};
  const finished=handler(req,response);await atRoleCheck;req.emit('error',Error('aborted'));assert.equal(response.destroyed,true);complete();await finished;assert.equal(headersSent,false);assert.equal(auth,0);
});
test('Node request error cancellation aborts Auth work and closes the unfinished response',async t=>{
  let reached;const entered=new Promise(resolve=>reached=resolve);let upstreamSignal;
  class Pool {on(){}async query(){return {rows:[{permitted:true}]};}async end(){}}
  const handler=adapter.createVercelHandler({env,loadPg:async()=>({Pool}),fetchImpl:async(url,options)=>{upstreamSignal=options.signal;reached();return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));}});
  const req=request({body:{afterSequence:'0',limit:1}}),response=new Writable({write(chunk,encoding,callback){callback();}});response.writeHead=()=>{};req.on('error',()=>{});
  const finished=handler(req,response);t.after(async()=>{req.emit('aborted');await finished;response.destroy();});
  await entered;req.emit('error',Error('aborted'));assert.equal(upstreamSignal.aborted,true);await finished;assert.equal(response.destroyed,true);assert.equal(response.writableFinished,false);
});
test('Vercel streams the full verified 20MB photo JSON contract in bounded UTF8 byte chunks',async()=>{
  assert.equal(typeof adapter.writeVercelResponse,'function');
  const data=Buffer.alloc(20_000_000,65),sha256=createHash('sha256').update(data).digest('hex');
  const body={status:'downloaded',assetId:uid,sha256,bytes:data.length,mime:'image/jpeg',data:data.toString('base64'),synthetic:'😀é'};
  const chunks=[];const response=new Writable({highWaterMark:1,write(chunk,encoding,callback){chunks.push(Buffer.from(chunk));setImmediate(callback);}});
  response.writeHead=(code,headers)=>{assert.equal(code,200);assert.equal(headers['Content-Type'],'application/json');};
  await adapter.writeVercelResponse(response,200,{'Content-Type':'application/json'},body);
  assert.ok(response.writableFinished);assert.ok(chunks.length>100);assert.ok(chunks.every(chunk=>chunk.length<=65536));
  const downloaded=JSON.parse(Buffer.concat(chunks).toString('utf8'));assert.deepEqual(downloaded,body);assert.equal(createHash('sha256').update(Buffer.from(downloaded.data,'base64')).digest('hex'),sha256);
});
test('streamed response stops after recipient closes instead of ignoring backpressure',async()=>{
  assert.equal(typeof adapter.writeVercelResponse,'function');
  let writes=0;const response=new Writable({highWaterMark:1,write(chunk,encoding,callback){writes++;this.destroy();callback();}});response.writeHead=()=>{};
  await assert.rejects(()=>adapter.writeVercelResponse(response,200,{}, {value:'x'.repeat(200000)}));assert.equal(writes,1);
});
test('Vercel import is inert and cold starts share one restricted verified TLS pool',async()=>{
  const {handler,state,queries}=runtime();assert.equal(state.pools,0);
  const responses=await Promise.all([send(handler,{url:'/health',method:'GET'}),send(handler,{url:'/health',method:'GET'})]);
  for(const result of responses)assert.deepEqual(result.body,{status:'ok',writesEnabled:false});
  assert.equal(state.pools,1);assert.equal(state.auth,0);assert.equal(queries.length,1);assert.equal(state.options.connectionString,env.DATABASE_URL);assert.equal(state.options.max,2);
});
test('startup refuses production, missing config, invalid origin, unverified TLS and unsafe roles with sanitized errors',async()=>{
  for(const patch of [{VERCEL_ENV:'production'},{TRACKER_ENVIRONMENT:'production'},{DATABASE_URL:''},{DATABASE_URL:'postgresql://synthetic@localhost/db?sslmode=require'},{SUPABASE_PUBLISHABLE_KEY:'service_role_synthetic'},{TRACKER_ALLOWED_ORIGIN:'*'},{TRACKER_ALLOWED_ORIGIN:''}]) {
    const {handler,state}=runtime({env:patch});const result=await send(handler,{url:'/health',method:'GET'});assert.equal(result.code,503);assert.deepEqual(result.body,{status:'error',code:'gateway_unavailable'});assert.equal(state.pools,0);
  }
  const {handler,state}=runtime({permitted:false});assert.equal((await send(handler,{url:'/health',method:'GET'})).code,503);assert.equal(state.ends,1);
});
test('Vercel handler preserves exact origin/path, content type, JWT rejection and JSON error boundaries',async()=>{
  const {handler,state,queries}=runtime();
  for(const url of ['/api/gateway','/pull?route=push','/pull/','/%70ull','//pull','/private'])assert.equal((await send(handler,{url})).code,404);
  assert.equal((await send(handler,{extraHeaders:{origin:'https://other.example.invalid'}})).code,403);
  assert.equal((await send(handler,{extraHeaders:{'content-type':'text/plain'}})).code,415);
  assert.equal((await send(handler,{extraHeaders:{authorization:'Bearer invalid'}})).code,401);assert.equal(state.auth,0);
  assert.equal((await send(handler,{raw:'invalid'})).body.code,'invalid_json');
  assert.equal((await send(handler,{raw:JSON.stringify(JSON.stringify({afterSequence:'0',limit:1})),bodyGetter(){return JSON.stringify({afterSequence:'0',limit:1});}})).body.code,'invalid_cursor');
  assert.equal((await send(handler,{body:{value:'é'.repeat(1048576)}})).code,413);
  const preflight=await send(handler,{method:'OPTIONS'});assert.equal(preflight.code,204);assert.equal(preflight.headers['Access-Control-Allow-Origin'],env.TRACKER_ALLOWED_ORIGIN);assert.equal(preflight.headers['Access-Control-Allow-Credentials'],undefined);
  assert.equal(queries.length,1);
});
test('Vercel raw chunked body rejects promptly over the limit without destroying the reply socket',async t=>{
  const {handler,state}=runtime();const server=http.createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const code=await new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/push',method:'POST',headers},res=>{clearTimeout(deadline);res.resume();req.destroy();resolve(res.statusCode);});
    req.on('error',reject);const deadline=setTimeout(()=>{req.destroy();reject(Error('waited for EOF'));},1000);
    req.write('x'.repeat(2097153));
  });assert.equal(code,413);assert.equal(state.auth,0);
});
test('raw bootstrap v2 and photo routes reuse domain handlers and default disabled writes',async()=>{
  const {handler,state,queries}=runtime();
  const result=await send(handler,{url:'/bootstrap-v2',body:{headSequence:null,cursor:null,limit:10}});assert.equal(result.code,200);assert.match(queries.at(-1).sql,/tracker_sync.bootstrap_v2/);assert.deepEqual(queries.at(-1).params.slice(0,3),[uid,'preview','syntheticpreview']);
  for(const url of ['/push','/photo-prepare','/photo-finalize','/photo-abandon'])assert.deepEqual((await send(handler,{url})).body,{status:'error',code:'writes_disabled'});
  assert.equal((await send(handler,{url:'/photo-download',body:{}})).body.code,'invalid_photo_operation');assert.equal(state.auth,6);assert.equal(queries.length,2);
});
test('photo download streams JSON only after the existing authenticated storage and SHA256 checks',async()=>{
  const photo=Buffer.from([255,216,255,217]),sha256=createHash('sha256').update(photo).digest('hex');
  const result={assetId:other,sha256,bytes:photo.length,mime:'image/jpeg',path:`syntheticpreview/preview/${uid}/${other}/original.jpg`};
  const body={protocolVersion:2,assetId:other,deviceId:uid};
  const valid=runtime({result,photo});const response=await send(valid.handler,{url:'/photo-download',body});assert.equal(response.code,200);assert.deepEqual(response.body,{status:'downloaded',assetId:other,sha256,bytes:photo.length,mime:'image/jpeg',data:photo.toString('base64')});assert.match(valid.queries.at(-1).sql,/tracker_sync.photo_asset/);
  const corrupt=runtime({result:{...result,sha256:'0'.repeat(64)},photo});const denied=await send(corrupt.handler,{url:'/photo-download',body});assert.equal(denied.code,400);assert.deepEqual(denied.body,{status:'error',code:'photo_verification_failed'});
});
test('enabled preview writes retain exact project and UID allowlist for JSON and photos',async()=>{
  const approved={TRACKER_ENABLE_PREVIEW_WRITES:'true',TRACKER_WRITE_PROJECT_REF:'syntheticpreview',TRACKER_WRITE_USER_IDS:uid};
  const {handler,queries}=runtime({uid:other,env:approved});
  assert.equal((await send(handler,{url:'/health',method:'GET'})).body.writesEnabled,true);
  for(const url of ['/push','/photo-prepare'])assert.equal((await send(handler,{url,extraHeaders:{authorization:'Bearer '+token(other)}})).body.code,'write_account_not_approved');
  assert.equal(queries.length,1);
  const invalid=runtime({env:{...approved,TRACKER_WRITE_PROJECT_REF:'other'}});assert.equal((await send(invalid.handler,{url:'/health',method:'GET'})).code,503);assert.equal(invalid.state.pools,0);
});
