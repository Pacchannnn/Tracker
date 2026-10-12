import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqlStore,createGateway} from '../cloud/gateway.js';
import {createRuntimeGateway,createHttpServer} from '../cloud/server.js';

const uid='11111111-1111-4111-8111-111111111111';
test('negotiated photo feed uses explicit v2 SQL functions and accepts photo paging cursor',async()=>{
  const calls=[];
  const store=createSqlStore(async(sql,params)=>{calls.push({sql,params});return {rows:[{result:{status:'ok'}}]};});
  const gateway=createGateway({verifyIdentity:async()=>({uid}),store,environment:'test',projectId:'synthetic'});
  assert.deepEqual(await gateway.handle({route:'pull-v2',body:{afterSequence:'0',limit:10}}),{status:'ok'});
  assert.deepEqual(await gateway.handle({route:'bootstrap-v2',body:{headSequence:'2',cursor:{kind:'photo',recordId:'legacy'},limit:10}}),{status:'ok'});
  assert.match(calls[0].sql,/tracker_sync.pull_v2\(/);
  assert.match(calls[1].sql,/tracker_sync.bootstrap_v2\(/);
  assert.equal((await gateway.handle({route:'bootstrap',body:{headSequence:'2',cursor:{kind:'photo',recordId:'legacy'},limit:10}})).code,'invalid_cursor');
});
test('HTTP photo routes retain authentication, CORS and default disabled writes',async t=>{
  let verified=0;
  const gateway=createRuntimeGateway({verifyIdentity:async()=>{verified++;return {uid};},store:{},photoStore:{prepare(){throw Error('write reached');}},storage:{},environment:'test',projectId:'synthetic'});
  const server=createHttpServer(gateway,{allowedOrigin:'https://synthetic.invalid'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port;
  const response=await fetch(url+'/photo-prepare',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://synthetic.invalid'},body:'{}'});
  assert.equal(response.status,400);
  assert.deepEqual(await response.json(),{status:'error',code:'writes_disabled'});
  assert.equal(verified,1);
  const denied=await fetch(url+'/photo-prepare',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.invalid'},body:'{}'});
  assert.equal(denied.status,403);assert.equal(verified,1);
});
