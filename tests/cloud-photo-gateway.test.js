import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const gatewayModule = await import('../cloud/photo-gateway.js').catch(() => null);
const storageModule = await import('../cloud/photo-storage.js').catch(() => null);
const uid = '11111111-1111-4111-8111-111111111111';
const deviceId = '22222222-2222-4222-8222-222222222222';
const originalId = '33333333-3333-4333-8333-333333333333';
const thumbId = '44444444-4444-4444-8444-444444444444';
const bytes = Buffer.from([255,216,255,224,0,2,255,217]);
const descriptor = assetId => ({ assetId,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,mime:'image/jpeg' });
const operation = () => ({ protocolVersion:2,operationId:'55555555-5555-4555-8555-555555555555',deviceId,action:'create',recordId:'legacy:/photo',baseRevision:null,metadata:{id:'legacy:/photo',date:'2026-10-11',category:'daily',pose:'',weight:null,waist:null,note:'',createdAt:'2026-10-11T00:00:00.000Z',updatedAt:'2026-10-11T00:00:00.000Z'},original:descriptor(originalId),thumbnail:descriptor(thumbId),ownerBaseRevision:null,dailyPhotoSet:[] });

test('photo boundary preserves legacy IDs and rejects forged scope, verification and shared asset identity', () => {
  assert.ok(gatewayModule,'photo gateway is implemented');
  assert.deepEqual(gatewayModule.validatePhotoOperation(operation()),operation());
  for(const patch of [{uid},{verified:true},{protocolVersion:1},{original:{...descriptor(originalId),path:'other/object.jpg'}},{thumbnail:descriptor(originalId)},{dailyPhotoSet:[{recordId:'x',revision:'01'}]}]) assert.throws(() => gatewayModule.validatePhotoOperation({...operation(),...patch}));
});
test('trusted verifier checks downloaded bytes, JPEG envelope, MIME and bounded size', async () => {
  assert.ok(storageModule,'storage verifier is implemented');
  assert.deepEqual(storageModule.verifyPhotoBytes(bytes,'image/jpeg',descriptor(originalId)),descriptor(originalId));
  for(const [data,mime,want] of [[Buffer.from([1,2,3]),'image/jpeg',descriptor(originalId)],[bytes,'image/png',descriptor(originalId)],[bytes,'image/jpeg',{...descriptor(originalId),bytes:7}],[bytes,'image/jpeg',{...descriptor(originalId),sha256:'0'.repeat(64)}]]) assert.throws(() => storageModule.verifyPhotoBytes(data,mime,want));
});
test('storage REST adapter uses same user JWT and fixed HTTPS private path, without overwrite', async () => {
  assert.ok(storageModule);
  const requests=[];
  const adapter=storageModule.createPhotoStorage({projectUrl:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic',fetchImpl:async(url,options)=>{requests.push({url,options});return new Response(bytes,{headers:{'content-type':'image/jpeg','content-length':String(bytes.length)}});}});
  const path=`synthetic/test/${uid}/55555555-5555-4555-8555-555555555555/original.jpg`;
  const result=await adapter.read({path,authorization:'Bearer synthetic.jwt.value',expected:descriptor(originalId)});
  assert.equal(result.sha256,descriptor(originalId).sha256);
  assert.equal(requests[0].url,`https://synthetic.supabase.co/storage/v1/object/authenticated/tracker-preview-photos/${path}`);
  assert.equal(requests[0].options.headers.Authorization,'Bearer synthetic.jwt.value');
  assert.equal(requests[0].options.redirect,'error');
  assert.equal(adapter.uploadCapability(path).upsert,false);
  await assert.rejects(()=>adapter.read({path:'../other',authorization:'Bearer x',expected:descriptor(originalId)}));
  await assert.rejects(()=>adapter.read({path:path.replace(uid,'-'.repeat(36)),authorization:'Bearer x',expected:descriptor(originalId)}));
});
test('photo writes require explicit UID approval and reauthenticate every request', async () => {
  assert.ok(gatewayModule);
  const config={verifyIdentity:async()=>({uid}),store:{prepare(){throw Error('must not reach writes');}},environment:'test',projectId:'synthetic'};
  assert.equal((await gatewayModule.createPhotoGateway(config).handle({route:'photo-prepare',authorization:'Bearer a',body:operation()})).code,'writes_disabled');
  assert.equal((await gatewayModule.createPhotoGateway({...config,allowWrites:true}).handle({route:'photo-prepare',authorization:'Bearer a',body:operation()})).code,'write_account_not_approved');
  assert.equal((await gatewayModule.createPhotoGateway({...config,verifyIdentity:async()=>{throw Error('secret');}}).handle({route:'photo-prepare',body:operation()})).code,'unauthorized');
});

test('unbounded Storage response stops at expected size and never marks manifest verified', async () => {
  let cancelled=false;
  const adapter=storageModule.createPhotoStorage({projectUrl:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic',fetchImpl:async()=>new Response(new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(9));},cancel(){cancelled=true;}}),{headers:{'content-type':'image/jpeg'}})});
  const path=`synthetic/test/${uid}/55555555-5555-4555-8555-555555555555/original.jpg`;
  await assert.rejects(()=>adapter.read({path,authorization:'Bearer synthetic.jwt.value',expected:descriptor(originalId)}),/photo_verification_failed/);
  assert.equal(cancelled,true);
});

test('aborted trusted download leaves manifest staged without verification or finalize', async () => {
  const lifecycle=new AbortController();let verified=false,finalized=false;
  const gateway=gatewayModule.createPhotoGateway({verifyIdentity:async()=>({uid}),environment:'test',projectId:'synthetic',allowWrites:true,allowedWriteUids:[uid],
    store:{manifest:async()=>({action:'create',state:'prepared',original:{...descriptor(originalId),path:'original'},thumbnail:{...descriptor(thumbId),path:'thumbnail'}}),verify:async()=>{verified=true;},finalize:async()=>{finalized=true;}},
    storage:{read:async()=>{lifecycle.abort();return {...descriptor(originalId),path:'original',data:bytes};}}});
  const result=await gateway.handle({route:'photo-finalize',authorization:'Bearer synthetic',body:{protocolVersion:2,manifestId:'55555555-5555-4555-8555-555555555555',deviceId},signal:lifecycle.signal});
  assert.equal(result.code,'request_aborted');assert.equal(verified,false);assert.equal(finalized,false);
});
