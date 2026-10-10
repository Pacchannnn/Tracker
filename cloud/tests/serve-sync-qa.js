import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createGateway, createSqlStore } from '../gateway.js';
import { createHttpServer, assertGatewayConnection } from '../server.js';

// Disposable in-memory synthetic QA only. Never configure real credentials here.
// No external network calls, uploads, authentication provider, or user origin8765.
const db = new PGlite(), servers = [];
const accounts = { A: '11111111-1111-4111-8111-111111111111', B: '22222222-2222-4222-8222-222222222222' };
const devices = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];
let closing = false;
async function close() {
  if (closing) return; closing = true;
  await Promise.all(servers.map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
  await db.close(); process.stdin.pause();
}
try {
  await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  for (const name of ['001_foundation.sql', '002_sync_counts.sql']) await db.exec(await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8'));
  for (const uid of Object.values(accounts)) {
    await db.query('INSERT INTO auth.users(id) VALUES($1::uuid)', [uid]);
    for (const device of devices) await db.query('SELECT tracker_sync.register_account_device($1::uuid,$2::text,$3::text,$4::uuid)', [uid, 'preview', 'syntheticqa', device]);
  }
  await db.exec('SET ROLE tracker_gateway');
  await assertGatewayConnection((sql, params) => db.query(sql, params));
  const sqlStore = createSqlStore((sql, params) => db.query(sql, params));
  const gateway = createGateway({ store: sqlStore, environment: 'preview', projectId: 'syntheticqa', allowWrites: true,
    verifyIdentity: async authorization => {
      if (authorization === 'Bearer synthetic-A') return { uid: accounts.A };
      if (authorization === 'Bearer synthetic-B') return { uid: accounts.B };
      throw Error('unauthorized');
    }
  });
  for (const [port, allowedOrigin] of [[8842, 'http://127.0.0.1:8840'], [8843, 'http://127.0.0.1:8841']]) {
    const server = createHttpServer(gateway, { allowedOrigin }); servers.push(server);
    server.requestTimeout = 15000; server.headersTimeout = 10000;
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  }
  // Only synthetic aggregate counters; never return payloads, IDs or tokens here.
  const diagnostics = http.createServer(async (request, response) => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (request.method !== 'GET' || request.url !== '/counts') { response.writeHead(404, headers); response.end('{}'); return; }
    try {
      const counts = {};
      for (const [name, uid] of Object.entries(accounts)) {
        const state = await sqlStore.readState({ uid, environment: 'preview', projectId: 'syntheticqa' });
        counts[name] = { head: state.headSequence, live: state.records.filter(r => !r.deleted).length, tombstones: state.records.filter(r => r.deleted).length };
      }
      response.writeHead(200, headers); response.end(JSON.stringify({ syntheticOnly: true, counts }));
    } catch { response.writeHead(503, headers); response.end('{"syntheticOnly":true,"unavailable":true}'); }
  });
  servers.push(diagnostics);
  await new Promise((resolve, reject) => { diagnostics.once('error', reject); diagnostics.listen(8845, '127.0.0.1', resolve); });
  process.stdout.write('READY synthetic-only PostgreSQL WASM gateways 127.0.0.1:8842 / 8843; counters 127.0.0.1:8845/counts. No external requests.\n');
  process.once('SIGINT', () => { void close(); }); process.once('SIGTERM', () => { void close(); });
  process.stdin.setEncoding('utf8'); process.stdin.on('data', text => { if (text.trim() === 'stop') void close(); });
} catch {
  process.stderr.write('Synthetic QA harness unavailable; configuration and request values omitted.\n');
  await close(); process.exitCode = 1;
}
