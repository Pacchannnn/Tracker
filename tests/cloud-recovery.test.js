import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';
import { createHash } from 'node:crypto';
const api = await import('../js/cloud-recovery.js').catch(() => ({}));
const scope = { uid: '11111111-1111-4111-8111-111111111111', environment: 'preview', projectId: 'synthetic' };
const deviceId = '22222222-2222-4222-8222-222222222222';
const newDevice = '33333333-3333-4333-8333-333333333333';
function fixture() {
  const data = emptyData(); data.exerciseNotes.private = 'access_token is a topic in my private note';
  const changes = [{ kind: 'exercise_note', recordId: 'private', action: 'create', baseRevision: null, payloadSchema: 8, payload: { text: data.exerciseNotes.private } }];
  const request = { protocolVersion: 1, commandType: 'import-records', deviceId, operationId: '44444444-4444-4444-8444-444444444444', dependencies: [], changes };
  return { workspace: { version: 1, scope, deviceId, localRevision: 2, data, shadow: [], outbox: [{ id: request.operationId, request, changes, dependsOn: [] }], conflicts: [{ base: [], local: [], remote: [], remoteAtConflict: [], archivedIntents: [] }], receipts: [], syncReceipts: [], cursor: '0', initialized: true, bootstrap: null, selectedLiveId: null }, assets: [], jobs: [], ledgers: [] };
}
function codec() { assert.equal(typeof api.createRecoveryCodec, 'function'); return api.createRecoveryCodec({ verifyCompleteSnapshot: async evidence => evidence }); }
const options = snapshot => ({ scope, completeSnapshot: { scope, head: '0', records: snapshot.workspace.shadow, counts: {}, verified: true }, recheckLocalRevision: async () => 2 });

test('invalid accepted domain payload is rejected even with matching counts and valid file hashes',async()=>{
  const source=fixture(),bad={kind:'food',recordId:'bad',payloadSchema:8,payload:{id:'bad'},deleted:false,revision:'1',commitSequence:'1',position:'0',phase:null,deviceId:null};
  source.workspace.shadow=[bad];source.workspace.cursor='1';
  await assert.rejects(()=>codec().createRecoveryPackage(source,{...options(source),completeSnapshot:{scope,head:'1',records:[bad],counts:{food:1},verified:true}}));
  const files=await codec().createRecoveryPackage(fixture(),options(fixture()));
  const raw=JSON.parse(files.workspace),manifest=JSON.parse(files.manifest);raw.workspace.shadow=[bad];raw.workspace.cursor='1';raw.head='1';
  const workspace=JSON.stringify(raw);manifest.head='1';manifest.counts.accepted={food:1};manifest.files.workspace.bytes=Buffer.byteLength(workspace);manifest.files.workspace.sha256=createHash('sha256').update(workspace).digest('hex');
  await assert.rejects(()=>codec().parseRecoveryPackage({...files,workspace,manifest:JSON.stringify(manifest)},{scope}));
});
test('complete three-file recovery preserves notes, frozen requests and restores under new detached ownership', async () => {
  const source = fixture(), original = structuredClone(source), recovery = codec();
  const files = await recovery.createRecoveryPackage(source, options(source));
  assert.deepEqual(Object.keys(files).sort(), ['manifest', 'photos', 'workspace']);
  const parsed = await recovery.parseRecoveryPackage(files, { scope });
  assert.deepEqual(parsed.snapshot, original);
  let saved, ownership;
  await recovery.restoreRecoveryPackage(files, { scope, deviceId: newDevice, saveDetached: async (snapshot, detached) => { saved = snapshot; ownership = detached; return detached; } });
  assert.equal(ownership.deviceId, newDevice); assert.equal(ownership.originalDeviceId, deviceId);
  assert.equal(ownership.networkResumeAllowed, false); assert.equal(saved.workspace.outbox[0].request.deviceId, deviceId);
  assert.deepEqual(source, original);
});
test('export fails closed without trusted evidence, during bootstrap, and after local revision changes', async () => {
  assert.throws(() => api.createRecoveryCodec({}), /complete/);
  const source = fixture(), recovery = codec();
  await assert.rejects(() => recovery.createRecoveryPackage(source, { ...options(source), completeSnapshot: true }), /complete/);
  source.workspace.bootstrap = { records: [] };
  await assert.rejects(() => recovery.createRecoveryPackage(source, options(source)), /incomplete/);
  source.workspace.bootstrap = null;
  await assert.rejects(() => recovery.createRecoveryPackage(source, { ...options(source), recheckLocalRevision: async () => 3 }), /revision/);
});
test('corrupt, wrong-scope and forged counts never reach detached writer', async () => {
  const source = fixture(), recovery = codec(), files = await recovery.createRecoveryPackage(source, options(source));
  let writes = 0; const restore = changed => recovery.restoreRecoveryPackage(changed, { scope, deviceId: newDevice, saveDetached: async () => writes++ });
  await assert.rejects(() => restore({ ...files, workspace: files.workspace + ' ' }), /hash/);
  const manifest = JSON.parse(files.manifest); manifest.counts.outbox = 42;
  await assert.rejects(() => restore({ ...files, manifest: JSON.stringify(manifest) }), /count/);
  await assert.rejects(() => recovery.parseRecoveryPackage(files, { scope: { ...scope, projectId: 'other' } }), /scope/);
  assert.equal(writes, 0);
});
test('credentials in structured state are rejected while private note text is retained', async () => {
  const source = fixture(); source.workspace.access_token = 'secret';
  await assert.rejects(() => codec().createRecoveryPackage(source, options(source)), /secret/);
});
const asset = (id, middle = []) => {
  const raw = Uint8Array.from([255, 216, ...middle, 255, 217]);
  return { assetId: id, sha256: createHash('sha256').update(raw).digest('hex'), bytes: raw.length, mime: 'image/jpeg', path: `synthetic/preview/${scope.uid}/${deviceId}/original.jpg`, blob: new Blob([raw], { type: 'image/jpeg' }) };
};
test('recovery preserves every original and thumbnail asset including archived conflict and orphan cache bytes', async () => {
  const source = fixture();
  source.assets = [asset('55555555-5555-4555-8555-555555555555'), asset('66666666-6666-4666-8666-666666666666', [1]), asset('77777777-7777-4777-8777-777777777777', [2, 3])];
  const metadata = source.assets.map(({ blob, ...rest }) => rest);
  source.workspace.conflicts[0].archivedIntents = [{ changes: [{ after: { payload: { original: metadata[0], thumbnail: metadata[1] } } }] }];
  const photo = { id: 'legacy photo id', date: '2026-10-11', category: 'other', pose: '', weight: null, waist: null, note: '', createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z', original: metadata[0], thumbnail: metadata[1] };
  source.jobs.push({ id: '88888888-8888-4888-8888-888888888888', scope, deviceId, localRevision: 2, operation: 'put', before: [], after: [photo], dependsOn: [], request: null, state: 'queued' });
  const recovery = codec(), files = await recovery.createRecoveryPackage(source, options(source));
  const parsed = await recovery.parseRecoveryPackage(files, { scope });
  assert.deepEqual(parsed.snapshot, source);
  const noBytes = fixture(); noBytes.workspace.conflicts[0].remoteAtConflict = [{ original: metadata[0] }];
  await assert.rejects(() => recovery.createRecoveryPackage(noBytes, options(noBytes)), /incomplete_recovery_asset/);
  source.assets[0].sha256 = 'a'.repeat(64);
  await assert.rejects(() => recovery.createRecoveryPackage(source, options(source)), /asset_hash/);
});
test('malformed frozen requests and photo job ownership fail before a detached write', async () => {
  const source = fixture(); source.workspace.outbox[0].request.protocolVersion = 99;
  await assert.rejects(() => codec().createRecoveryPackage(source, options(source)), /request|outbox/);
  const jobs = fixture(); jobs.jobs = [{ id: '88888888-8888-4888-8888-888888888888', scope: { ...scope, projectId: 'foreign' }, deviceId, localRevision: 1, before: [], after: [], dependsOn: [] }];
  await assert.rejects(() => codec().createRecoveryPackage(jobs, options(jobs)), /job|scope/);
});
test('photo storage paths from another account cannot enter a same-account recovery package', async () => {
  const source = fixture(), foreign = asset('55555555-5555-4555-8555-555555555555');
  foreign.path = foreign.path.replace(scope.uid, newDevice); source.assets = [foreign];
  await assert.rejects(() => codec().createRecoveryPackage(source, options(source)), /scope|path/);
});
test('unverified fixed-head evidence cannot declare a cached accepted subset complete', async () => {
  const source = fixture();
  await assert.rejects(() => codec().createRecoveryPackage(source, { ...options(source), completeSnapshot: { ...options(source).completeSnapshot, counts: { food: 1 } } }), /incomplete_accepted/);
  const raw = { ...options(source).completeSnapshot, records: [{ kind: 'food', recordId: 'hidden' }] };
  await assert.rejects(() => codec().createRecoveryPackage(source, { ...options(source), completeSnapshot: raw }), /incomplete_accepted/);
});
