import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {ASSETS,readAssets,audit,noLinks} from './static-package.js';
import {gatewayArtifact,auditGateway} from './vercel-gateway-package.js';

const root=resolve(process.cwd()),cleanPath='.local/vercel-preview-artifact',stagePath='.local/vercel-preview-upload';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const metadata=new Set(['.vercel/project.json','.vercel/README.txt','.gitignore']);
function checkNames(path,expected,staging=false) {
  const permitted=new Set([...expected.keys(),...(staging?metadata:[])]);
  const folders=new Set([...permitted].flatMap(name=>name.split('/').slice(0,-1).map((_,i,parts)=>parts.slice(0,i+1).join('/'))));
  noLinks(root,path);
  function visit(relative='') {
    for(const item of readdirSync(join(root,path,relative),{withFileTypes:true})) {
      const name=relative?relative+'/'+item.name:item.name;noLinks(root,path+'/'+name);
      if(item.isDirectory()&&folders.has(name))visit(name);
      else if(!item.isFile() || !permitted.has(name))throw Error('unapproved_output');
      else if(staging && name==='.gitignore' && !/^\s*\.vercel\/?\s*$/.test(readFileSync(join(root,path,name),'utf8')))throw Error('unapproved_staging_ignore');
    }
  }
  visit();
}
function writeArtifact(path,expected) {
  noLinks(root,path);if(existsSync(join(root,path)))checkNames(path,expected,path===stagePath);
  for(const [name,bytes]of expected) {noLinks(root,path+'/'+name);mkdirSync(dirname(join(root,path,name)),{recursive:true});writeFileSync(join(root,path,name),bytes);}
}
function inspect(path,expected,staging=false) {
  checkNames(path,expected,staging);const actual=new Map();
  const inventory=[...expected].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>{
    const found=readFileSync(join(root,path,name));if(sha(found)!==sha(bytes))throw Error('artifact_integrity_failed');actual.set(name,found);return {path:name,bytes:found.length,sha256:sha(found)};
  });
  auditGateway(actual,new Set(actual.keys()));audit(new Map(ASSETS.map(name=>[name,actual.get('public/'+name)])));
  return inventory;
}
try {
  const args=process.argv.slice(2);if(args.length>1 || args.some(arg=>!['--check','--inventory','--stage'].includes(arg)))throw Error('invalid_arguments');
  const publicAssets=readAssets(root);audit(publicAssets);const expected=gatewayArtifact(root);
  for(const [name,bytes]of publicAssets)expected.set('public/'+name,bytes);
  for(const name of ['scripts/static-package.js','scripts/vercel-preview-build.js']) {noLinks(root,name);expected.set(name,readFileSync(join(root,name)));}
  const routes=['health','push','pull','bootstrap','receipt','pull-v2','bootstrap-v2','photo-prepare','photo-finalize','photo-abandon','photo-download'];
  const config=JSON.parse(expected.get('vercel.json'));
  config.buildCommand='node scripts/vercel-preview-build.js';config.rewrites=routes.map(route=>({source:'/'+route,destination:'/api/gateway'}));
  config.headers=['/','/index.html','/js/:path*','/css/:path*','/assets/:path*'].map(source=>({source,headers:[{key:'Cache-Control',value:'no-cache'}]}));
  expected.set('vercel.json',Buffer.from(JSON.stringify(config,null,2)+'\n'));auditGateway(expected,new Set(expected.keys()));
  if(!args.length)writeArtifact(cleanPath,expected);
  const inventory=inspect(cleanPath,expected);
  if(args[0]==='--stage') {writeArtifact(stagePath,expected);inspect(stagePath,expected,true);}
  console.log(args[0]==='--inventory'?JSON.stringify(inventory,null,2):`PASS: ${inventory.length} approved combined files; graph/privacy/import/hash checks passed. Output: ${args[0]==='--stage'?stagePath:cleanPath}`);
} catch {console.error('Combined preview packaging rejected: invalid source, configuration or retained output; values redacted.');process.exitCode=1;}
