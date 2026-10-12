import { buildPhotoRequest, photoRelevant } from './cloud-store.js?v=41';
import { canonical } from './cloud-records.js?v=41';
import { validatePhotoAsset, validatePhotoDescriptor, validatePhotoAssetPath } from './cloud-photo.js?v=41';
const equal=(a,b)=>canonical(a)===canonical(b);
const strip=({path,...descriptor})=>descriptor;
const safeError=error=>/^(?:photo_[a-z_]+|revision_conflict|stale_daily_photo_set|stale_owner_photo_set|asset_id_reused|operation_id_reused|invalid_photo_operation|invalid_photo_acknowledgement|writes_disabled|write_account_not_approved|unauthorized|request_aborted)$/.test(error.message)?error.message:'photo_request_failed';
export function createPhotoSync({store,scope,request,upload,isCurrent=()=>true}){
  let sealed=false,running=null;const controller=new AbortController();
  const guard=()=>{if(sealed||!isCurrent()||controller.signal.aborted)throw Error('sealed_or_stale_workspace');};
  const call=async(route,body)=>{guard();const response=await request(route,body,{signal:controller.signal});guard();if(['error','conflict','rejected'].includes(response?.status)){const error=Error(response.code??'photo_request_failed');error.terminal=['conflict','rejected'].includes(response.status);throw error;}return response;};
  async function patch(id,change){guard();const row=await store.read(scope);guard();return store.updatePhotoJob(scope,id,change,row.localRevision);}
  async function conflict(job,error){const snapshot=await store.captureSnapshot(scope);guard();await store.updatePhotoJob(scope,job.id,{state:'conflict',error:safeError(error),conflict:{base:(job.initialBase??[]).filter(record=>photoRelevant(job,record)),local:job.after,remote:snapshot.workspace.shadow.filter(r=>photoRelevant(job,r))}},snapshot.workspace.localRevision);}
  async function process(job){
    let snapshot=await store.captureSnapshot(scope);guard();
    if(!job.request){let body;try{body=buildPhotoRequest(snapshot,job);}catch(error){if(error.message==='photo_dependency_pending')return;await conflict(job,error);return;}await store.updatePhotoJob(scope,job.id,{request:body,state:'sending'},snapshot.workspace.localRevision);job=(await store.captureSnapshot(scope)).jobs.find(j=>j.id===job.id);}
    if(!job.manifest){const result=await call('photo-prepare',job.request);if(result?.status==='applied'){await store.ackPhotoJob(scope,job.id,result);return;}if(result?.status!=='prepared')throw Error(result?.code??'invalid_photo_manifest');await patch(job.id,{manifest:result,manifestId:result.manifestId,state:'sending'});job={...job,manifest:result,manifestId:result.manifestId};}
    if(job.state!=='staged'&&['put','replace'].includes(job.operation)){
      for(const kind of ['original','thumbnail']){guard();const descriptor=job.after[0][kind],expected=job.manifest[kind];if(!equal(strip(expected),strip(descriptor)))throw Error('photo_manifest_descriptor_mismatch');validatePhotoAssetPath(expected.path,scope,job.manifestId,kind);const asset=await store.readPhotoAsset(scope,descriptor.assetId);if(!asset)throw Error('photo_bytes_missing');await validatePhotoAsset(asset);guard();await upload(job.manifest.uploads[kind],asset.blob,{descriptor:expected,signal:controller.signal});guard();}
      await patch(job.id,{state:'staged',error:null});
    }
    const result=await call('photo-finalize',{protocolVersion:2,manifestId:job.manifestId,deviceId:job.deviceId});if(result?.status!=='applied')throw Error(result?.code??'invalid_photo_acknowledgement');guard();await store.ackPhotoJob(scope,job.id,result);
  }
  async function flush(){guard();if(running)return running;running=(async()=>{const snapshot=await store.captureSnapshot(scope);for(const job of snapshot.jobs){guard();if(['applied','conflict'].includes(job.state))continue;try{await process(job);}catch(error){guard();if(error.terminal||/revision_conflict|owner_missing|photo_set|expired|abandoned|collision/.test(error.message))await conflict(job,error);else await patch(job.id,{error:safeError(error)});}}})().finally(()=>{running=null;});return running;}
  async function download(descriptor){guard();validatePhotoDescriptor(descriptor);if(descriptor.path){const parts=descriptor.path.split('/');validatePhotoAssetPath(descriptor.path,scope,parts[3],parts[4]?.slice(0,-4));}const cached=await store.readPhotoAsset(scope,descriptor.assetId);if(cached){if(!equal(strip((({blob,...rest})=>rest)(cached)),strip(descriptor)))throw Error('photo_asset_collision');await validatePhotoAsset(cached);guard();return cached.blob;}const row=await store.read(scope);const result=await call('photo-download',{protocolVersion:2,assetId:descriptor.assetId,deviceId:row.deviceId});if(result?.status!=='downloaded'||!equal({assetId:result.assetId,sha256:result.sha256,bytes:result.bytes,mime:result.mime},strip(descriptor))||typeof result.data!=='string'||result.data.length>Math.ceil(descriptor.bytes/3)*4)throw Error('photo_verification_failed');const binary=atob(result.data),blob=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:descriptor.mime});await store.cachePhotoAsset(scope,descriptor,blob);guard();return blob;}
  return {flush,download,seal(){sealed=true;controller.abort();}};
}
