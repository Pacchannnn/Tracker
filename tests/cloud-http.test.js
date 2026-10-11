import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHttpServer, assertGatewayConnection } from '../cloud/server.js';
import * as serverModule from '../cloud/server.js';

test('hosting config accepts only exact HTTPS origin and keeps local defaults', () => {
  assert.equal(typeof serverModule.hostingConfig,'function');
  assert.deepEqual(serverModule.hostingConfig({}),{host:'127.0.0.1',port:8832,allowedOrigin:null});
  assert.deepEqual(serverModule.hostingConfig({TRACKER_ALLOWED_ORIGIN:'https://tracker.example.invalid',PORT:'10000'}),{host:'0.0.0.0',port:10000,allowedOrigin:'https://tracker.example.invalid'});
  for(const value of ['*','null','http://tracker.example.invalid','https://tracker.example.invalid/','https://user:pass@tracker.example.invalid','https://tracker.example.invalid/path']) assert.throws(()=>serverModule.hostingConfig({TRACKER_ALLOWED_ORIGIN:value}));
  assert.throws(()=>serverModule.hostingConfig({PORT:'invalid'}));
});
test('hosted gateway limits CORS to one origin and answers health without database access', async t => {
  let calls=0; const server=createHttpServer({async handle(){calls++; return {status:'error',code:'unauthorized'};}},{allowedOrigin:'https://tracker.example.invalid'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}`;
  let r=await fetch(url+'/health'); assert.equal(r.status,200); assert.deepEqual(await r.json(),{status:'ok',writesEnabled:false}); assert.equal(calls,0);
  r=await fetch(url+'/pull',{method:'OPTIONS',headers:{Origin:'https://tracker.example.invalid'}}); assert.equal(r.status,204); assert.equal(r.headers.get('access-control-allow-origin'),'https://tracker.example.invalid'); assert.equal(r.headers.get('access-control-allow-credentials'),null);
  r=await fetch(url+'/pull',{method:'POST',headers:{Origin:'https://other.example.invalid','Content-Type':'application/json'},body:'{}'}); assert.equal(r.status,403); assert.equal(calls,0);
  r=await fetch(url+'/pull',{method:'POST',headers:{Origin:'https://tracker.example.invalid','Content-Type':'application/json'},body:'{}'}); assert.equal(r.status,401); assert.equal(calls,1);
});

test('server requires explicit certificate-verified database TLS', () => {
  assert.equal(typeof serverModule.requireDatabaseTls, 'function');
  for (const value of ['postgres://synthetic@localhost/db', 'postgres://synthetic@localhost/db?sslmode=require', 'postgres://synthetic@localhost/db?sslmode=disable', 'postgres://synthetic@localhost/db?sslmode=verify-full&sslmode=disable', 'https://localhost/db?sslmode=verify-full']) assert.throws(() => serverModule.requireDatabaseTls(value));
  assert.equal(serverModule.requireDatabaseTls('postgresql://synthetic@localhost/db?sslmode=verify-full'), 'postgresql://synthetic@localhost/db?sslmode=verify-full');
});

test('backend refuses privileged or unrecognized database connection role', async () => {
  for (const rows of [[], [{ permitted: false }], [{ permitted: true }, { permitted: true }]]) await assert.rejects(() => assertGatewayConnection(async () => ({ rows })), /unsafe_gateway_database_role/);
  await assertGatewayConnection(async (sql, params) => { assert.ok(sql.includes('rolbypassrls')); assert.ok(sql.includes('tracker_sync_owner')); assert.deepEqual(params, []); return { rows: [{ permitted: true }] }; });
});

test('local gateway HTTP enforces origin/JSON/routes and private no-store responses', async t => {
  let calls = 0;
  const server = createHttpServer({ async handle(request) { calls++; assert.equal(request.route, 'pull'); return { status: 'error', code: 'unauthorized' }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  let r = await fetch(url + '/pull', { method: 'POST', headers: { Origin: 'https://unapproved.invalid', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403); assert.equal(calls, 0);
  r = await fetch(url + '/pull', { method: 'POST', body: '{}' }); assert.equal(r.status, 415);
  r = await fetch(url + '/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'invalid' }); assert.equal(r.status, 400);
  r = await fetch(url + '/private'); assert.equal(r.status, 404);
  r = await fetch(url + '/pull', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(r.status, 401); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.equal(calls, 1);
});
test('gateway rejects oversized HTTP bodies without calling SQL/auth handlers', async t => {
  const server = createHttpServer({ handle() { assert.fail('oversized request reached gateway'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synthetic: 'x'.repeat(2097152) }) });
  assert.equal(response.status, 413);
});
test('oversized chunked request is rejected without waiting for sender EOF', async t => {
  const server = createHttpServer({ handle() { assert.fail('oversized request reached handler'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const status = await new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port: server.address().port, path: '/push', method: 'POST', headers: { 'Content-Type': 'application/json' } }, response => { clearTimeout(deadline); response.resume(); request.destroy(); resolve(response.statusCode); });
    request.on('error', reject);
    const deadline = setTimeout(() => { request.destroy(); reject(Error('server waited for EOF')); }, 1000);
    request.write('x'.repeat(2097153)); // Deliberately do not call end().
  });
  assert.equal(status, 413);
});
