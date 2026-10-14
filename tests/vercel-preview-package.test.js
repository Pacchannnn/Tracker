import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ASSETS} from '../scripts/static-package.js';
const repo=resolve(import.meta.dirname,'..'),cli=join(repo,'scripts/vercel-preview-package.js'),build=join(repo,'scripts/vercel-preview-build.js');
const artifact=root=>join(root,'.local/vercel-preview-artifact'),stage=root=>join(root,'.local/vercel-preview-upload');
function fixture(t) {
  assert.ok(existsSync(cli),'combined preview packager missing');assert.ok(existsSync(build),'combined preview build missing');
  const root=mkdtempSync(join(tmpdir(),'tracker-combined-preview-'));t.after(()=>{assert.ok(root.startsWith(join(tmpdir(),'tracker-combined-preview-')));rmSync(root,{recursive:true,force:true});});
  for(const path of [...ASSETS,'cloud/server.js','cloud/vercel.js','cloud/gateway.js','cloud/photo-gateway.js','cloud/photo-storage.js','cloud/package.json','cloud/package-lock.json','scripts/static-package.js','scripts/vercel-preview-build.js']) {mkdirSync(join(root,path,'..'),{recursive:true});copyFileSync(join(repo,path),join(root,path));}
  return root;
}
const run=(root,...args)=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});
const publicKeys=['TRACKER_PUBLIC_CLOUD_ENABLED','TRACKER_PUBLIC_ENVIRONMENT','TRACKER_PUBLIC_SUPABASE_URL','TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY','TRACKER_PUBLIC_GATEWAY_URL'];
function runBuild(root,patch={}) {const env={...process.env,NODEJS_HELPERS:'0',VERCEL_ENV:'preview',VERCEL_URL:'tracker-preview-abc123.vercel.app',...Object.fromEntries(publicKeys.map(key=>[key,''])),...patch};return spawnSync(process.execPath,['scripts/vercel-preview-build.js'],{cwd:root,encoding:'utf8',env});}
const preview={TRACKER_PUBLIC_CLOUD_ENABLED:'true',TRACKER_PUBLIC_SUPABASE_URL:'https://syntheticpreview.supabase.co',TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_SYNTHETIC'};
test('combined artifact reuses all 57 public assets and only reviewed gateway/build files with explicit API rewrites',t=>{
  const root=fixture(t),before=readFileSync(join(root,'js/cloud-config.js'));
  for(const path of ['.env','MASTER_PLAN.md','tracker-backup-private.json','js/private.js','private-photo.jpg'])writeFileSync(join(root,path),'SYNTHETIC_PRIVATE');
  assert.equal(run(root).status,0);const inventory=JSON.parse(run(root,'--inventory').stdout);assert.equal(inventory.filter(x=>x.path.startsWith('public/')).length,57);assert.equal(inventory.length,77);
  assert.ok(inventory.every(x=>!/operator|migrations|MASTER_PLAN|backup-private|\.env|tests|private-photo|private\.js/.test(x.path)));
  for(const path of ASSETS)assert.deepEqual(readFileSync(join(artifact(root),'public',path)),readFileSync(join(root,path)));
  assert.deepEqual(readFileSync(join(root,'js/cloud-config.js')),before);
  const config=JSON.parse(readFileSync(join(artifact(root),'vercel.json')));assert.equal(config.outputDirectory,'public');assert.equal(config.buildCommand,'node scripts/vercel-preview-build.js');assert.equal(config.functions['api/gateway.js'].supportsCancellation,true);
  assert.equal(config.functions['api/gateway.js'].includeFiles,'{cloud/{server,vercel,gateway,photo-gateway,photo-storage},js/{data,custom-workout,program,session-identity,planning-draft,planner,cloud-records,cloud-photo,photo-store}}.js');
  assert.equal(config.rewrites.length,11);for(const route of ['health','push','pull','bootstrap','receipt','pull-v2','bootstrap-v2','photo-prepare','photo-finalize','photo-abandon','photo-download'])assert.ok(config.rewrites.some(rule=>rule.source==='/'+route&&rule.destination==='/api/gateway'));
  assert.deepEqual(config.headers.map(rule=>rule.source),['/','/index.html','/js/:path*','/css/:path*','/assets/:path*']);assert.ok(config.headers.every(rule=>JSON.stringify(rule.headers)===JSON.stringify([{key:'Cache-Control',value:'no-cache'}])));
  assert.ok(!config.rewrites.some(rule=>rule.source.includes('*')));assert.equal(run(root,'--check').status,0);
});
test('upload staging preserves Vercel link metadata separately from the strict clean artifact',t=>{
  const root=fixture(t);assert.equal(run(root).status,0);assert.equal(run(root,'--stage').status,0);
  mkdirSync(join(stage(root),'.vercel'));const metadata=JSON.stringify({projectId:'synthetic',orgId:'synthetic'});writeFileSync(join(stage(root),'.vercel/project.json'),metadata);writeFileSync(join(stage(root),'.vercel/README.txt'),'Synthetic link metadata');
  writeFileSync(join(stage(root),'.gitignore'),'.vercel\n');
  assert.equal(run(root,'--stage').status,0);assert.equal(readFileSync(join(stage(root),'.vercel/project.json'),'utf8'),metadata);assert.equal(run(root,'--check').status,0);
  writeFileSync(join(stage(root),'.gitignore'),'public\n');assert.notEqual(run(root,'--stage').status,0);writeFileSync(join(stage(root),'.gitignore'),'.vercel\n');
  writeFileSync(join(stage(root),'personal.txt'),'PRIVATE');assert.notEqual(run(root,'--stage').status,0);
  assert.equal(existsSync(join(artifact(root),'.vercel')),false);
});
test('preview build defaults to local-only and activates only public config at the canonical same origin',t=>{
  const root=fixture(t),source=readFileSync(join(root,'js/cloud-config.js'));assert.equal(run(root).status,0);assert.equal(run(root,'--stage').status,0);
  assert.equal(runBuild(stage(root)).status,0);assert.deepEqual(readFileSync(join(stage(root),'public/js/cloud-config.js')),source);
  const marker='SYNTHETIC_SERVER_ONLY_SENTINEL';const enabled=runBuild(stage(root),{...preview,DATABASE_URL:'postgresql://synthetic:'+marker+'@localhost/db',SUPABASE_SECRET_KEY:'sb_secret_'+'X'.repeat(40)});assert.equal(enabled.status,0,enabled.stderr);
  const text=readFileSync(join(stage(root),'public/js/cloud-config.js'),'utf8');assert.ok(text.includes('"gatewayUrl":"https://tracker-preview-abc123.vercel.app"'));assert.ok(text.includes('"enabled":true'));assert.ok(!text.includes(marker));assert.ok(!text.includes('sb_secret_'));assert.equal(runBuild(stage(root),preview).status,0);
  assert.deepEqual(readFileSync(join(root,'js/cloud-config.js')),source);assert.deepEqual(readFileSync(join(artifact(root),'public/js/cloud-config.js')),source);assert.equal(run(root,'--check').status,0);
});
test('invalid build config and unsafe public source reject before replacing output with redacted errors',t=>{
  const root=fixture(t);assert.equal(run(root).status,0);assert.equal(run(root,'--stage').status,0);const before=readFileSync(join(stage(root),'public/js/cloud-config.js'));
  for(const patch of [{VERCEL_ENV:'production'},{VERCEL_URL:'tracker.vercel.app/path'},{NODEJS_HELPERS:'1'},{TRACKER_PUBLIC_SUPABASE_URL:''},{TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_'+'X'.repeat(40)},{TRACKER_PUBLIC_CLOUD_ENABLED:'yes'},{TRACKER_PUBLIC_ENVIRONMENT:'production'},{TRACKER_PUBLIC_GATEWAY_URL:'https://other.example.invalid'}]) {const denied=runBuild(stage(root),{...preview,...patch});assert.notEqual(denied.status,0);assert.deepEqual(readFileSync(join(stage(root),'public/js/cloud-config.js')),before);assert.ok(!denied.stderr.includes(patch.TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'unlikely-private-sentinel'));}
  writeFileSync(join(root,'js/app.js'),"fetch('/unreviewed');");assert.notEqual(run(root).status,0);assert.equal(run(root,'--check').status,1);
});
