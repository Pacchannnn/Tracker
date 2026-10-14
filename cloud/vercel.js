import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHttpHandler,createRuntimeGateway,hostingConfig,previewWritePolicy,requireDatabaseTls,assertGatewayConnection} from './server.js';
import {createIdentityVerifier,createSqlStore} from './gateway.js';
import {createPhotoSqlStore} from './photo-gateway.js';
import {createPhotoStorage} from './photo-storage.js';

const MAX_REQUEST_BYTES=2097152;
// NODEJS_HELPERS=0 must be set at build time to retain the raw wire body.
// Never consult request.body: a parsed getter loses wire size and JSON type.
export async function readVercelBody(request) {
  const declared=request.headers['content-length'];
  if(declared!==undefined && (!/^\d+$/.test(declared) || Number(declared)>MAX_REQUEST_BYTES)) throw Error('payload_too_large');
  if(request.readableEnded || request.destroyed)throw Error('invalid_json');
  const chunks=await new Promise((resolve,reject)=>{
    const received=[];let size=0;
    const finish=(error)=>{request.removeListener('data',data);request.removeListener('end',end);request.removeListener('error',failure);request.removeListener('aborted',aborted);error?reject(error):resolve(received);};
    const data=chunk=>{const bytes=Buffer.from(chunk);size+=bytes.length;if(size>MAX_REQUEST_BYTES){request.pause();finish(Error('payload_too_large'));}else received.push(bytes);};
    const end=()=>finish(),failure=()=>finish(Error('invalid_json')),aborted=()=>finish(Error('request_aborted'));
    request.once('end',end);request.once('error',failure);request.once('aborted',aborted);request.on('data',data);
  });
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('invalid_json'); }
}

// Serialize only completed domain results: photo bytes have already passed hash
// verification. Stream bytes to avoid Vercel's buffered 4.5 MB response limit.
export async function writeVercelResponse(response,code,headers,body) {
  const bytes=code===204?Buffer.alloc(0):Buffer.from(JSON.stringify(body),'utf8');
  response.writeHead(code,headers);
  function* chunks() {for(let offset=0;offset<bytes.length;offset+=65536)yield bytes.subarray(offset,offset+65536);}
  await pipeline(Readable.from(chunks()),response);
}

// Lazy initialization avoids database access or a listener during build/import.
// Each warm instance reuses one small pool and one role-checked initialization.
export function createVercelHandler({env=process.env,loadPg=()=>import('pg'),fetchImpl=fetch}={}) {
  let initialized;
  async function initialize() {
    const hosting=hostingConfig(env),writes=previewWritePolicy(env);
    const {SUPABASE_PROJECT_URL:projectUrl,SUPABASE_PUBLISHABLE_KEY:publishableKey,DATABASE_URL:connectionString}=env;
    if(env.VERCEL_ENV!=='preview' || env.TRACKER_ENVIRONMENT!=='preview' || !hosting.allowedOrigin || !connectionString || !projectUrl || !publishableKey)throw Error('missing_preview_config');
    const verifiedConnection=requireDatabaseTls(connectionString);
    const verifyIdentity=createIdentityVerifier({projectUrl,publishableKey,fetchImpl});
    const storage=createPhotoStorage({projectUrl,publishableKey,fetchImpl});
    const {Pool}=await loadPg();
    const pool=new Pool({connectionString:verifiedConnection,max:2,connectionTimeoutMillis:10000,statement_timeout:15000,idleTimeoutMillis:10000,allowExitOnIdle:true});
    pool.on('error',()=>{}); // No credentials, SQL, provider bodies or payload logs.
    try {
      await assertGatewayConnection((sql,params)=>pool.query(sql,params));
      const query=(sql,params)=>pool.query(sql,params);
      const gateway=createRuntimeGateway({verifyIdentity,store:createSqlStore(query),photoStore:createPhotoSqlStore(query),storage,environment:'preview',projectId:new URL(projectUrl).hostname.split('.')[0],allowWrites:writes.enabled,allowedWriteUids:writes.allowedUids});
      return createHttpHandler(gateway,{allowedOrigin:hosting.allowedOrigin,writesEnabled:writes.enabled,readBody:readVercelBody,writeResponse:writeVercelResponse});
    } catch(error) {try {await pool.end();}catch{}throw error;}
  }
  return async(request,response)=>{
    let cancelled=request.aborted || response.destroyed;
    const cancel=()=>{cancelled=true;if(!response.writableFinished)response.destroy();};
    request.once('aborted',cancel);request.once('error',cancel);
    try {
      if(cancelled){cancel();return;}
      const attempt=initialized??=initialize();let handler;
      try {handler=await attempt;}
      catch(error) {if(initialized===attempt)initialized=undefined;throw error;}
      if(!cancelled && !response.destroyed)await handler(request,response);
    } catch {
      if(!cancelled && !response.headersSent && !response.destroyed) {
        try {await writeVercelResponse(response,503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'},{status:'error',code:'gateway_unavailable'});}
        catch {response.destroy();}
      } else if(!response.writableFinished)response.destroy();
    } finally {request.removeListener('aborted',cancel);request.removeListener('error',cancel);}
  };
}

export default createVercelHandler();
