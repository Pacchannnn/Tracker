import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,readdirSync,existsSync,rmSync,globSync} from 'node:fs';
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
const backend=['cloud/server.js','cloud/vercel.js','cloud/gateway.js','cloud/photo-gateway.js','cloud/photo-storage.js','js/data.js','js/custom-workout.js','js/program.js','js/session-identity.js','js/planning-draft.js','js/planner.js','js/cloud-records.js','js/cloud-photo.js','js/photo-store.js'].sort();

test('includeFiles expands to exactly the reviewed backend graph and the isolated Lambda imports and returns sanitized 503',t=>{
  const root=fixture(t);assert.equal(run(root).status,0);const packaged=output(root);
  const config=JSON.parse(readFileSync(join(packaged,'vercel.json'))),pattern=config.functions['api/gateway.js'].includeFiles;
  assert.equal(typeof pattern,'string');assert.ok(pattern.length<=256);assert.ok(!/[?*]/.test(pattern));
  const included=globSync(pattern,{cwd:packaged}).map(path=>path.replaceAll('\\','/')).sort();assert.deepEqual(included,backend);
  const lambda=join(root,'isolated-lambda');mkdirSync(lambda);
  for(const path of [...included,'api/gateway.js','package.json']){mkdirSync(join(lambda,path,'..'),{recursive:true});copyFileSync(join(packaged,path),join(lambda,path));}
  const invoke=`import handler from './api/gateway.js'; import {Readable,Writable} from 'node:stream';
    const chunks=[],req=Readable.from([]);Object.assign(req,{method:'GET',url:'/health',headers:{}});
    const res=new Writable({write(chunk,encoding,callback){chunks.push(Buffer.from(chunk));callback();}});res.writeHead=code=>{res.code=code;};
    await handler(req,res);const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(res.code!==503 || JSON.stringify(body)!==JSON.stringify({status:'error',code:'gateway_unavailable'}))throw Error('unsanitized missing config');
    console.log('ISOLATED_LAMBDA_503_PASS');`;
  const env={...process.env,VERCEL_ENV:'preview',VERCEL_URL:'synthetic-preview.vercel.app',TRACKER_ENVIRONMENT:'preview',TRACKER_ALLOWED_ORIGIN:'',TRACKER_ENABLE_PREVIEW_WRITES:'false',SUPABASE_PROJECT_URL:'',SUPABASE_PUBLISHABLE_KEY:'',DATABASE_URL:''};
  const result=spawnSync(process.execPath,['--input-type=module','-e',invoke],{cwd:lambda,encoding:'utf8',env});assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'ISOLATED_LAMBDA_503_PASS');
  rmSync(join(lambda,'js/custom-workout.js'));const missing=spawnSync(process.execPath,['--input-type=module','-e',invoke],{cwd:lambda,encoding:'utf8',env});assert.notEqual(missing.status,0);assert.ok(missing.stderr.includes('ERR_MODULE_NOT_FOUND'));
});
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
