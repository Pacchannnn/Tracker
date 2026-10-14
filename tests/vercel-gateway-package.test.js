import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const repo=resolve(import.meta.dirname,'..'),cli=join(repo,'scripts/vercel-gateway-package.js');
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'tracker-vercel-package-'));
  t.after(()=>{assert.ok(root.startsWith(join(tmpdir(),'tracker-vercel-package-')));rmSync(root,{recursive:true,force:true});});
  for(const folder of ['cloud','js']) {mkdirSync(join(root,folder));for(const file of readdirSync(join(repo,folder)))if(/\.(js|json)$/.test(file))copyFileSync(join(repo,folder,file),join(root,folder,file));}
  return root;
}
const output=root=>join(root,'.local/vercel-gateway');
const run=(root,...args)=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});
test('Vercel package is a deployable single Node function with production pg only and no source/private files served',t=>{
  assert.ok(existsSync(cli),'Vercel packaging script missing');const root=fixture(t);
  for(const path of ['.env','MASTER_PLAN.md','tracker-backup-private.json','private-photo.jpg'])writeFileSync(join(root,path),'SYNTHETIC_PRIVATE');
  assert.equal(run(root).status,0);assert.equal(run(root,'--check').status,0);
  const inventory=JSON.parse(run(root,'--inventory').stdout);assert.equal(inventory.length,18);
  assert.ok(inventory.every(x=>!/operator|migrations|MASTER_PLAN|backup|\.env|tests|\.jpg/.test(x.path)));
  for(const name of ['cloud/server.js','cloud/vercel.js','cloud/photo-storage.js','api/gateway.js','vercel.json','package.json','package-lock.json'])assert.ok(inventory.some(x=>x.path===name));
  const pkg=JSON.parse(readFileSync(join(output(root),'package.json')));assert.deepEqual(pkg.dependencies,{pg:'8.23.1'});assert.equal(pkg.devDependencies,undefined);assert.equal(pkg.engines.node,'24.x');
  const lock=JSON.parse(readFileSync(join(output(root),'package-lock.json')));assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);assert.ok(!Object.keys(lock.packages).some(x=>x.includes('pglite')));
  const config=JSON.parse(readFileSync(join(output(root),'vercel.json')));assert.equal(config.framework,null);assert.equal(config.outputDirectory,'public');assert.equal(config.installCommand,'npm ci --omit=dev');assert.deepEqual(Object.keys(config.functions),['api/gateway.js']);assert.equal(config.functions['api/gateway.js'].maxDuration,60);assert.equal(config.functions['api/gateway.js'].supportsCancellation,true);assert.deepEqual(config.rewrites,[{source:'/:path*',destination:'/api/gateway'}]);
  const imported=spawnSync(process.execPath,['--input-type=module','-e',"import('./api/gateway.js').then(m=>{if(typeof m.default!=='function')throw Error('handler missing'); console.log('INERT_IMPORT_PASS');})"],{cwd:output(root),encoding:'utf8'});assert.equal(imported.status,0,imported.stderr);assert.ok(imported.stdout.includes('INERT_IMPORT_PASS'));
  writeFileSync(join(output(root),'cloud/vercel.js'),'tampered');assert.notEqual(run(root,'--check').status,0);
});
test('Vercel package rejects unexpected retained files and new imports before mutating reviewed output',t=>{
  assert.ok(existsSync(cli),'Vercel packaging script missing');const root=fixture(t);assert.equal(run(root).status,0);
  const before=readFileSync(join(output(root),'cloud/vercel.js'));
  writeFileSync(join(root,'cloud/vercel.js'),"import './operator.js';");assert.notEqual(run(root).status,0);assert.deepEqual(readFileSync(join(output(root),'cloud/vercel.js')),before);
  copyFileSync(join(repo,'cloud/vercel.js'),join(root,'cloud/vercel.js'));
  writeFileSync(join(output(root),'.env'),'SYNTHETIC_PRIVATE');assert.notEqual(run(root).status,0);assert.deepEqual(readFileSync(join(output(root),'cloud/vercel.js')),before);
});
test('Vercel packaging redacts secret values and validates all source files before copying',t=>{
  assert.ok(existsSync(cli),'Vercel packaging script missing');const root=fixture(t);assert.equal(run(root).status,0);
  const secret='sb_secret_'+'S'.repeat(40),before=readFileSync(join(output(root),'cloud/gateway.js'));
  writeFileSync(join(root,'cloud/gateway.js'),`export const secret='${secret}';`);const result=run(root);assert.notEqual(result.status,0);assert.ok(!result.stderr.includes(secret));assert.deepEqual(readFileSync(join(output(root),'cloud/gateway.js')),before);
});
