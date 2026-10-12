import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const repo=resolve(import.meta.dirname,'..'), cli=join(repo,'scripts/gateway-package.js');
function fixture(t){const root=mkdtempSync(join(tmpdir(),'tracker-gateway-package-'));t.after(()=>{assert.ok(root.startsWith(join(tmpdir(),'tracker-gateway-package-')));rmSync(root,{recursive:true,force:true});});
for(const folder of ['cloud','js']) {mkdirSync(join(root,folder));for(const file of readdirSync(join(repo,folder))){if(/\.(js|json)$/.test(file))copyFileSync(join(repo,folder,file),join(root,folder,file));}}
return root;}
function run(root,...args){return spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});}
test('gateway package explicitly includes only server and required domain modules, never operator/private files',t=>{
  assert.ok(existsSync(cli),'gateway packaging script missing');const root=fixture(t);
  for(const file of ['.env','MASTER_PLAN.md','tracker-backup-private.json'])writeFileSync(join(root,file),'SYNTHETIC_PRIVATE');
  const built=run(root);assert.equal(built.status,0,built.stderr);
  const inventory=JSON.parse(run(root,'--inventory').stdout);assert.equal(inventory.length,16);
  for(const path of ['cloud/photo-gateway.js','cloud/photo-storage.js','js/cloud-photo.js','js/photo-store.js'])assert.ok(inventory.some(x=>x.path===path));
  assert.ok(inventory.some(x=>x.path==='js/data.js'));assert.ok(inventory.some(x=>x.path==='cloud/server.js'));
  assert.ok(inventory.every(x=>!/operator|MASTER_PLAN|backup|\.env|tests|photos/.test(x.path)));
  assert.equal(run(root,'--check').status,0);
  const imported=spawnSync(process.execPath,['--input-type=module','-e',"import('./cloud/server.js').then(m=>{if(m.previewWritePolicy({}).enabled)throw Error('writes enabled');console.log('IMPORT_PASS')})"],{cwd:join(root,'gateway-dist'),encoding:'utf8'});
  assert.equal(imported.status,0,imported.stderr);assert.ok(imported.stdout.includes('IMPORT_PASS'));
  writeFileSync(join(root,'gateway-dist/cloud/server.js'),'tampered');assert.notEqual(run(root,'--check').status,0);
});
test('invalid or missing gateway inputs preserve existing artifact and redact secret values',t=>{
  assert.ok(existsSync(cli),'gateway packaging script missing');const root=fixture(t);assert.equal(run(root).status,0);const before=readFileSync(join(root,'gateway-dist/cloud/server.js'));
  const secret='sb_secret_'+ 'S'.repeat(40);writeFileSync(join(root,'cloud/gateway.js'),`export const x='${secret}';`);
  const denied=run(root);assert.notEqual(denied.status,0);assert.ok(!denied.stderr.includes(secret));assert.deepEqual(readFileSync(join(root,'gateway-dist/cloud/server.js')),before);
  for(const type of ['', 'RSA ', 'EC ', 'OPENSSH ', 'DSA ', 'ENCRYPTED ']) {
    const header='-----BEGIN '+type+'PRIVATE KEY-----';writeFileSync(join(root,'cloud/gateway.js'),`export const x='${header}';`);
    const rejected=run(root);assert.notEqual(rejected.status,0);assert.ok(!rejected.stderr.includes(header));assert.deepEqual(readFileSync(join(root,'gateway-dist/cloud/server.js')),before);
  }
});
