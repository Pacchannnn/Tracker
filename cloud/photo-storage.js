import { createHash } from 'node:crypto';

export const PHOTO_BUCKET = 'tracker-preview-photos';
export const MAX_PHOTO_BYTES = 20_000_000;
const fail = code => { throw Error(code); };
const pathPattern = /^[a-z0-9-]{1,128}\/(test|preview|production)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(original|thumbnail)\.jpg$/;

export function verifyPhotoBytes(input, mime, expected) {
  const bytes=Buffer.from(input);
  if(mime!=='image/jpeg' || expected?.mime!=='image/jpeg' || bytes.length<4 || bytes.length>MAX_PHOTO_BYTES || bytes.length!==expected.bytes
    || bytes[0]!==255 || bytes[1]!==216 || bytes[2]!==255 || bytes.at(-2)!==255 || bytes.at(-1)!==217
    || createHash('sha256').update(bytes).digest('hex')!==expected.sha256) fail('photo_verification_failed');
  return {...expected};
}

// No credential is minted. INSERT policies authorize only an active manifest's
// immutable object paths using the same verified user JWT. This adapter never
// performs network I/O until read is explicitly invoked by an authenticated route.
export function createPhotoStorage({projectUrl,publishableKey,fetchImpl=fetch}) {
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(projectUrl) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) fail('invalid_provider_config');
  const validPath=path=>{if(typeof path!=='string' || !pathPattern.test(path))fail('invalid_photo_path');return path;};
  return {
    uploadCapability(path) { return {bucket:PHOTO_BUCKET,path:validPath(path),method:'POST',upsert:false,mime:'image/jpeg'}; },
    async read({path,authorization,expected,signal}) {
      validPath(path);
      if(typeof authorization!=='string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization) || signal?.aborted)fail('unauthorized');
      if(!Number.isSafeInteger(expected?.bytes) || expected.bytes<4 || expected.bytes>MAX_PHOTO_BYTES)fail('photo_verification_failed');
      const timeout=AbortSignal.timeout(10000),boundedSignal=signal?AbortSignal.any([signal,timeout]):timeout;
      const response=await fetchImpl(`${projectUrl}/storage/v1/object/authenticated/${PHOTO_BUCKET}/${path}`,{method:'GET',headers:{apikey:publishableKey,Authorization:authorization},redirect:'error',cache:'no-store',signal:boundedSignal});
      if(!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='image/jpeg')fail('photo_unavailable');
      const length=response.headers.get('content-length');
      if(length!==null && (!/^\d+$/.test(length) || Number(length)!==expected.bytes))fail('photo_verification_failed');
      if(!response.body?.getReader)fail('photo_unavailable');
      const reader=response.body.getReader(),chunks=[];let size=0;
      try { for(;;) { if(boundedSignal.aborted)fail('request_aborted');const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>expected.bytes || size>MAX_PHOTO_BYTES)fail('photo_verification_failed');chunks.push(Buffer.from(value)); } }
      finally { try { await reader.cancel(); } catch {} }
      const bytes=Buffer.concat(chunks);
      return {...verifyPhotoBytes(bytes,'image/jpeg',expected),data:bytes};
    }
  };
}
