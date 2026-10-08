import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createGateway, createIdentityVerifier, createSqlStore } from './gateway.js';

export function requireDatabaseTls(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.searchParams.getAll('sslmode').length !== 1 || url.searchParams.get('sslmode') !== 'verify-full' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw Error('verified_database_tls_required');
  return connectionString;
}

export async function assertGatewayConnection(query) {
  const result = await query("SELECT NOT (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication) AND pg_catalog.pg_has_role(current_user,'tracker_gateway','USAGE') AND NOT pg_catalog.pg_has_role(current_user,'tracker_sync_owner','MEMBER') AS permitted FROM pg_catalog.pg_roles WHERE rolname=current_user", []);
  if (result.rows.length !== 1 || result.rows[0].permitted !== true) throw Error('unsafe_gateway_database_role');
}

// This local Node entry point is NOT a Vercel function or a deployed gateway.
export function createHttpServer(gateway, { allowedOrigin = null } = {}) {
  return http.createServer(async (request, response) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
    const origin = request.headers.origin;
    const reply = (code, body) => { response.writeHead(code, headers); response.end(JSON.stringify(body)); };
    if (origin && origin !== allowedOrigin) { reply(403, { status: 'error', code: 'origin_denied' }); return; }
    if (origin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
    if (request.method === 'OPTIONS' && origin) {
      headers['Access-Control-Allow-Methods'] = 'POST'; headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
      reply(204, null); return;
    }
    if (request.method !== 'POST' || !['/push', '/pull', '/bootstrap', '/receipt'].includes(request.url)) { reply(404, { status: 'error', code: 'unknown_route' }); return; }
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) { reply(415, { status: 'error', code: 'json_required' }); return; }
    try {
      const chunks = await new Promise((resolve, reject) => {
        let size = 0; const received = [];
        const data = chunk => {
          size += chunk.length;
          if (size > 2097152) { request.removeListener('data', data); request.pause(); resolve(null); }
          else received.push(chunk);
        };
        request.on('data', data); request.once('end', () => resolve(received)); request.once('error', reject);
      });
      if (chunks === null) {
        headers.Connection = 'close'; response.once('finish', () => request.destroy());
        reply(413, { status: 'error', code: 'payload_too_large' }); return;
      }
      let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { reply(400, { status: 'error', code: 'invalid_json' }); return; }
      const result = await gateway.handle({ route: request.url.slice(1), authorization: request.headers.authorization, body });
      reply(result.code === 'unauthorized' ? 401 : result.status === 'error' || result.status === 'rejected' ? 400 : result.status === 'conflict' ? 409 : 200, result);
    } catch { if (!response.headersSent) reply(500, { status: 'error', code: 'request_failed' }); }
  });
}

async function start() {
  // Config comes only from the server process. Nothing injects it into frontend assets.
  const { SUPABASE_PROJECT_URL: projectUrl, SUPABASE_PUBLISHABLE_KEY: publishableKey, TRACKER_ENVIRONMENT: environment, DATABASE_URL: connectionString } = process.env;
  if (!connectionString || !projectUrl || !publishableKey || !['test', 'preview', 'production'].includes(environment)) throw Error('missing_server_config');
  const verifyIdentity = createIdentityVerifier({ projectUrl, publishableKey });
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: requireDatabaseTls(connectionString), max: 4, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  pool.on('error', () => { /* No credentials/query/payload logging. Requests return sanitized failures. */ });
  try { await assertGatewayConnection((sql, params) => pool.query(sql, params)); } catch (error) { await pool.end(); throw error; }
  const gateway = createGateway({ verifyIdentity, store: createSqlStore((sql, params) => pool.query(sql, params)), environment, projectId: new URL(projectUrl).hostname.split('.')[0], allowWrites: false });
  const server = createHttpServer(gateway); // No CORS origin enabled in this batch.
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  server.listen(8832, '127.0.0.1', () => { process.stdout.write('Local read-only gateway: http://127.0.0.1:8832; writes disabled.\n'); });
  const close = () => server.close(() => { void pool.end(); });
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(() => { process.stderr.write('Gateway unavailable. Check approved server configuration; values redacted.\n'); process.exitCode = 1; });
}
