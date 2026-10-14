import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createGateway, createIdentityVerifier, createSqlStore } from './gateway.js';
import { createPhotoGateway, createPhotoSqlStore } from './photo-gateway.js';
import { createPhotoStorage } from './photo-storage.js';

// Both protocols share the same fixed-project identity and reviewed write policy.
export function createRuntimeGateway({photoStore,storage,...config}) {
  const json=createGateway(config);
  const photos=createPhotoGateway({...config,store:photoStore,storage,allowedWriteUids:config.allowedWriteUids ?? []});
  return {handle:request => request.route.startsWith('photo-') ? photos.handle(request) : json.handle(request)};
}

export function requireDatabaseTls(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.searchParams.getAll('sslmode').length !== 1 || url.searchParams.get('sslmode') !== 'verify-full' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw Error('verified_database_tls_required');
  return connectionString;
}

export async function assertGatewayConnection(query) {
  const result = await query("SELECT NOT (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication) AND pg_catalog.pg_has_role(current_user,'tracker_gateway','USAGE') AND NOT pg_catalog.pg_has_role(current_user,'tracker_sync_owner','MEMBER') AS permitted FROM pg_catalog.pg_roles WHERE rolname=current_user", []);
  if (result.rows.length !== 1 || result.rows[0].permitted !== true) throw Error('unsafe_gateway_database_role');
}

// HTTPS terminates at the approved hosting proxy; no TLS keys in this process.
export function hostingConfig(env = process.env) {
  const allowedOrigin=env.TRACKER_ALLOWED_ORIGIN || null;
  if(allowedOrigin && (!/^https:\/\/[a-z0-9]+(?:[.-][a-z0-9]+)*(?::\d{1,5})?$/i.test(allowedOrigin) || new URL(allowedOrigin).origin!==allowedOrigin)) throw Error('invalid_allowed_origin');
  const port=Number(env.PORT || 8832);
  if(!Number.isInteger(port) || port<1 || port>65535) throw Error('invalid_listen_port');
  return {host:allowedOrigin?'0.0.0.0':'127.0.0.1',port,allowedOrigin};
}

// This prepares a capability; operators still require human approval to activate it.
export function previewWritePolicy(env = process.env) {
  const enabled=env.TRACKER_ENABLE_PREVIEW_WRITES || 'false';
  if(!['true','false'].includes(enabled)) throw Error('invalid_preview_write_policy');
  if(enabled==='false') return {enabled:false,allowedUids:[]};
  const ref=/^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(env.SUPABASE_PROJECT_URL || '')?.[1];
  const allowedUids=(env.TRACKER_WRITE_USER_IDS || '').split(',').map(value=>value.trim());
  if(env.TRACKER_ENVIRONMENT!=='preview' || !ref || env.TRACKER_WRITE_PROJECT_REF!==ref || !hostingConfig(env).allowedOrigin || !allowedUids.length || allowedUids.length>10 || new Set(allowedUids).size!==allowedUids.length || allowedUids.some(uid=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))) throw Error('invalid_preview_write_policy');
  return {enabled:true,allowedUids};
}

// Both the local server and hosting adapters retain this HTTP trust boundary.
export function createHttpHandler(gateway, { allowedOrigin = null, writesEnabled = false, requestLimit = 120, now = Date.now, readBody = null, writeResponse = (response,code,headers,body) => { response.writeHead(code,headers); response.end(JSON.stringify(body)); } } = {}) {
  if(typeof writesEnabled!=='boolean' || !Number.isInteger(requestLimit) || requestLimit<1 || requestLimit>10000 || typeof now!=='function' || readBody!==null&&typeof readBody!=='function' || typeof writeResponse!=='function') throw Error('invalid_http_limits');
  let windowStart=now(),requests=0;
  return async (request, response) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
    const origin = request.headers.origin;
    const reply = (code, body) => writeResponse(response,code,headers,body);
    if (origin && origin !== allowedOrigin) return reply(403, { status: 'error', code: 'origin_denied' });
    if (origin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    if(request.method==='GET' && request.url==='/health') return reply(200,{status:'ok',writesEnabled});
    if (request.method === 'OPTIONS' && origin) {
      headers['Access-Control-Allow-Methods'] = 'POST'; headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
      return reply(204, null);
    }
    if (request.method !== 'POST' || !['/push', '/pull', '/bootstrap', '/receipt', '/pull-v2', '/bootstrap-v2', '/photo-prepare', '/photo-finalize', '/photo-abandon', '/photo-download'].includes(request.url)) return reply(404, { status: 'error', code: 'unknown_route' });
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) return reply(415, { status: 'error', code: 'json_required' });
    const timestamp=now();
    if(timestamp-windowStart>=60000 || timestamp<windowStart){windowStart=timestamp;requests=0;}
    if(++requests>requestLimit){headers['Retry-After']=String(Math.max(1,Math.ceil((60000-timestamp+windowStart)/1000)));return reply(429,{status:'error',code:'rate_limited'});}
    const lifecycle=new AbortController();
    const cancel=()=>{lifecycle.abort();if(!response.writableFinished)response.destroy();};
    request.once('aborted',cancel);request.once('error',cancel);
    response.once('close',()=>{if(!response.writableFinished)lifecycle.abort();});
    try {
      let body;
      if(readBody) {
        try { body=await readBody(request); }
        catch(error) {
          if(lifecycle.signal.aborted)return;
          if(error.message==='payload_too_large'){headers.Connection='close';response.once('finish',()=>request.destroy());}
          return reply(error.message==='payload_too_large'?413:400,{status:'error',code:error.message==='payload_too_large'?'payload_too_large':'invalid_json'});
        }
      } else {
      const chunks = await new Promise((resolve, reject) => {
        let size = 0; const received = [];
        const data = chunk => {
          size += chunk.length;
          if (size > 2097152) { request.removeListener('data', data); request.pause(); resolve(null); }
          else received.push(chunk);
        };
        request.on('data', data); request.once('end', () => resolve(received)); request.once('error', reject);request.once('aborted',()=>reject(Error('request_aborted')));
      });
      if (chunks === null) {
        headers.Connection = 'close'; response.once('finish', () => request.destroy());
        return reply(413, { status: 'error', code: 'payload_too_large' });
      }
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { status: 'error', code: 'invalid_json' }); }
      }
      if(lifecycle.signal.aborted)return;
      const result = await gateway.handle({ route: request.url.slice(1), authorization: request.headers.authorization, body, signal:lifecycle.signal });
      if(lifecycle.signal.aborted)return;
      return reply(result.code === 'unauthorized' ? 401 : result.status === 'error' || result.status === 'rejected' ? 400 : result.status === 'conflict' ? 409 : 200, result);
    } catch { if (!response.headersSent && !response.destroyed && !lifecycle.signal.aborted) return reply(500, { status: 'error', code: 'request_failed' }); }
  };
}

// This Node entry point does not listen when imported by a hosting adapter.
export function createHttpServer(gateway, options) {
  return http.createServer(createHttpHandler(gateway,options));
}

async function start() {
  const hosting=hostingConfig();
  const writes=previewWritePolicy();
  // Config comes only from the server process. Nothing injects it into frontend assets.
  const { SUPABASE_PROJECT_URL: projectUrl, SUPABASE_PUBLISHABLE_KEY: publishableKey, TRACKER_ENVIRONMENT: environment, DATABASE_URL: connectionString } = process.env;
  if (!connectionString || !projectUrl || !publishableKey || !['test', 'preview', 'production'].includes(environment)) throw Error('missing_server_config');
  const verifyIdentity = createIdentityVerifier({ projectUrl, publishableKey });
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: requireDatabaseTls(connectionString), max: 4, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  pool.on('error', () => { /* No credentials/query/payload logging. Requests return sanitized failures. */ });
  try { await assertGatewayConnection((sql, params) => pool.query(sql, params)); } catch (error) { await pool.end(); throw error; }
  const query=(sql,params)=>pool.query(sql,params);
  const gateway = createRuntimeGateway({ verifyIdentity, store: createSqlStore(query), photoStore:createPhotoSqlStore(query), storage:createPhotoStorage({projectUrl,publishableKey}), environment, projectId: new URL(projectUrl).hostname.split('.')[0], allowWrites:writes.enabled,allowedWriteUids:writes.allowedUids });
  const server = createHttpServer(gateway,{...hosting,writesEnabled:writes.enabled});
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  server.listen(hosting.port, hosting.host, () => { process.stdout.write(`Gateway started; preview writes ${writes.enabled?'enabled':'disabled'}. HTTPS requires the approved hosting proxy.\n`); });
  const close = () => server.close(() => { void pool.end(); });
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(() => { process.stderr.write('Gateway unavailable. Check approved server configuration; values redacted.\n'); process.exitCode = 1; });
}
