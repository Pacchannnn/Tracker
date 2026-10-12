import { validatePhotoMeta } from '../js/photo-store.js';
import { operationFingerprint } from './gateway.js';
import { MAX_PHOTO_BYTES } from './photo-storage.js';

const fail=code=>{throw Error(code);};
const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
const only=(value,keys)=>object(value) && Object.keys(value).every(key=>keys.includes(key));
const id=value=>typeof value==='string' && value.length>0 && value.length<=512;
const revision=value=>typeof value==='string' && /^[1-9][0-9]*$/.test(value) && BigInt(value)<=9223372036854775807n;
const timestamp=value=>typeof value==='string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value;
function descriptor(value) {
  if(!only(value,['assetId','sha256','bytes','mime']) || !uuid(value.assetId) || !/^[0-9a-f]{64}$/.test(value.sha256) || !Number.isSafeInteger(value.bytes) || value.bytes<4 || value.bytes>MAX_PHOTO_BYTES || value.mime!=='image/jpeg')fail('invalid_photo_operation');
}
export function validatePhotoOperation(raw) {
  if(!only(raw,['protocolVersion','operationId','deviceId','action','recordId','baseRevision','metadata','original','thumbnail','ownerBaseRevision','dailyPhotoSet','replacedPhotos','journalDate']) || raw.protocolVersion!==2
    || !uuid(raw.operationId) || !uuid(raw.deviceId) || !['create','edit','replace','delete','delete-daily'].includes(raw.action) || !id(raw.recordId)
    || (raw.action==='create'?raw.baseRevision!==null:raw.action==='replace'?!(raw.baseRevision===null || revision(raw.baseRevision)):!revision(raw.baseRevision)) || !(raw.ownerBaseRevision===null || revision(raw.ownerBaseRevision))
    || !Array.isArray(raw.dailyPhotoSet) || raw.dailyPhotoSet.length>10000 || raw.dailyPhotoSet.some(item=>!only(item,['recordId','revision']) || !id(item.recordId) || !revision(item.revision))
    || new Set(raw.dailyPhotoSet.map(item=>item.recordId)).size!==raw.dailyPhotoSet.length || Buffer.byteLength(JSON.stringify(raw))>2097152)fail('invalid_photo_operation');
  if(raw.action==='replace') {
    if(!Array.isArray(raw.replacedPhotos) || raw.replacedPhotos.length>10000 || raw.replacedPhotos.some(item=>!only(item,['recordId','revision']) || !id(item.recordId) || !revision(item.revision))
      || new Set(raw.replacedPhotos.map(item=>item.recordId)).size!==raw.replacedPhotos.length || (raw.baseRevision!==null && raw.replacedPhotos.length))fail('invalid_photo_operation');
  }else if(raw.replacedPhotos!==undefined)fail('invalid_photo_operation');
  if(raw.action==='delete-daily') {
    if(typeof raw.journalDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.journalDate) || !Number.isFinite(Date.parse(raw.journalDate)) || new Date(raw.journalDate).toISOString().slice(0,10)!==raw.journalDate)fail('invalid_photo_operation');
  }else if(raw.journalDate!==undefined)fail('invalid_photo_operation');
  if(!['delete','delete-daily'].includes(raw.action)) {
    if(!only(raw.metadata,['id','date','category','pose','weight','waist','note','ownerType','ownerId','createdAt','updatedAt']) || raw.metadata.id!==raw.recordId || !timestamp(raw.metadata.createdAt) || !timestamp(raw.metadata.updatedAt))fail('invalid_photo_operation');
    let validated;try {validated=validatePhotoMeta(raw.metadata);}catch {fail('invalid_photo_operation');}
    const supplied={...raw.metadata};delete supplied.id;delete supplied.createdAt;delete supplied.updatedAt;
    if(operationFingerprint(validated)!==operationFingerprint(supplied))fail('invalid_photo_operation');
    if(raw.metadata.ownerType && !revision(raw.ownerBaseRevision) || !raw.metadata.ownerType && raw.ownerBaseRevision!==null)fail('invalid_photo_operation');
  } else if(raw.metadata!==undefined || raw.original!==undefined || raw.thumbnail!==undefined || raw.ownerBaseRevision!==null)fail('invalid_photo_operation');
  if(['create','replace'].includes(raw.action)) {descriptor(raw.original);descriptor(raw.thumbnail);if(raw.original.assetId.toLowerCase()===raw.thumbnail.assetId.toLowerCase())fail('invalid_photo_operation');}
  else if(raw.original!==undefined || raw.thumbnail!==undefined)fail('invalid_photo_operation');
  return structuredClone(raw);
}
export function createPhotoSqlStore(query) {
  const run=async(name,scope,args=[],casts=[])=>{
    const params=[scope.uid,scope.environment,scope.projectId,...args];
    return (await query(`SELECT tracker_sync.${name}(${['uuid','text','text',...casts].map((cast,i)=>`$${i+1}::${cast}`).join(',')}) AS result`,params)).rows[0].result;
  };
  return {
    prepare:(scope,op,fingerprint)=>run('photo_prepare',scope,[JSON.stringify(op),fingerprint],['jsonb','text']),
    manifest:(scope,manifestId,deviceId)=>run('photo_manifest',scope,[manifestId,deviceId],['uuid','uuid']),
    verify:(scope,manifestId,deviceId,assets)=>run('photo_verify',scope,[manifestId,deviceId,JSON.stringify(assets)],['uuid','uuid','jsonb']),
    finalize:(scope,manifestId,deviceId)=>run('photo_finalize',scope,[manifestId,deviceId],['uuid','uuid']),
    abandon:(scope,manifestId,deviceId)=>run('photo_abandon',scope,[manifestId,deviceId],['uuid','uuid']),
    asset:(scope,assetId,deviceId)=>run('photo_asset',scope,[assetId,deviceId],['uuid','uuid'])
  };
}
export function createPhotoGateway({verifyIdentity,store,storage,environment,projectId,allowWrites=false,allowedWriteUids=[]}) {
  if(!['test','preview','production'].includes(environment) || !/^[a-z0-9-]{1,128}$/.test(projectId) || !Array.isArray(allowedWriteUids) || allowedWriteUids.some(value=>!uuid(value)))fail('invalid_scope');
  const approved=new Set(allowedWriteUids.map(value=>value.toLowerCase()));
  return {async handle({route,authorization,body,signal}) {
    let identity;try {if(signal?.aborted)fail('unauthorized');identity=await verifyIdentity(authorization,{signal});if(signal?.aborted || !uuid(identity?.uid))fail('unauthorized');}catch {return {status:'error',code:'unauthorized'};}
    const scope={uid:identity.uid.toLowerCase(),environment,projectId};
    try {
      if(route!=='photo-download') {if(!allowWrites)return {status:'error',code:'writes_disabled'};if(!approved.has(scope.uid))return {status:'error',code:'write_account_not_approved'};}
      if(route==='photo-prepare') {
        const operation=validatePhotoOperation(body),result=await store.prepare(scope,operation,operationFingerprint(operation));
        if(result?.status==='prepared' && ['create','replace'].includes(operation.action))return {...result,uploads:{original:storage.uploadCapability(result.original.path),thumbnail:storage.uploadCapability(result.thumbnail.path)}};
        return result;
      }
      if(['photo-finalize','photo-abandon'].includes(route)) {
        if(!only(body,['protocolVersion','manifestId','deviceId']) || body.protocolVersion!==2 || !uuid(body.manifestId) || !uuid(body.deviceId))fail('invalid_photo_operation');
        if(route==='photo-abandon')return await store.abandon(scope,body.manifestId,body.deviceId);
        const manifest=await store.manifest(scope,body.manifestId,body.deviceId);
        if(!manifest)fail('photo_unavailable');
        if(manifest.receipt)return manifest.receipt;
        if(manifest.expired)return await store.finalize(scope,body.manifestId,body.deviceId);
        if(['create','replace'].includes(manifest.action) && manifest.state==='prepared') {
          const assets={};
          for(const kind of ['original','thumbnail']) {
            if(signal?.aborted)fail('request_aborted');
            const verified=await storage.read({path:manifest[kind].path,authorization,expected:manifest[kind],signal});
            const {data,...descriptor}=verified;assets[kind]=descriptor;
          }
          if(signal?.aborted)fail('request_aborted');
          await store.verify(scope,body.manifestId,body.deviceId,assets);
        }
        if(signal?.aborted)fail('request_aborted');return await store.finalize(scope,body.manifestId,body.deviceId);
      }
      if(route==='photo-download') {
        if(!only(body,['protocolVersion','assetId','deviceId']) || body.protocolVersion!==2 || !uuid(body.assetId) || !uuid(body.deviceId))fail('invalid_photo_operation');
        const asset=await store.asset(scope,body.assetId,body.deviceId);if(!asset)fail('photo_unavailable');
        const downloaded=await storage.read({path:asset.path,authorization,expected:asset,signal});
        return {status:'downloaded',assetId:asset.assetId,sha256:asset.sha256,bytes:asset.bytes,mime:asset.mime,data:downloaded.data.toString('base64')};
      }
      return {status:'error',code:'unknown_route'};
    } catch(error) {return {status:'error',code:['invalid_photo_operation','photo_verification_failed','photo_unavailable','request_aborted'].includes(error.message)?error.message:'request_failed'};}
  }};
}
