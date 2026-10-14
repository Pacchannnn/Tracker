// Local allowlisted artifact only. No install, credentials, network or deploy.
import {readFileSync,writeFileSync,lstatSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=resolve(process.cwd()),relativeOutput='.local/vercel-gateway',output=join(root,relativeOutput);
const sources=['cloud/server.js','cloud/vercel.js','cloud/gateway.js','cloud/photo-gateway.js','cloud/photo-storage.js','js/data.js','js/custom-workout.js','js/program.js','js/session-identity.js','js/planning-draft.js','js/planner.js','js/cloud-records.js','js/cloud-photo.js','js/photo-store.js'];
// Exact brace expansion retains versioned ESM imports missed by file tracing.
const includeFiles='{cloud/{server,vercel,gateway,photo-gateway,photo-storage},js/{data,custom-workout,program,session-identity,planning-draft,planner,cloud-records,cloud-photo,photo-store}}.js';
const paths=[...sources,'api/gateway.js','package.json','package-lock.json','vercel.json'].sort(),allowed=new Set(paths),folders=new Set(['cloud','js','api']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function noLinks(base,path='') {
  let current=base;
  for(const part of ['',...path.split('/').filter(Boolean)]) {if(part)current=join(current,part);const info=lstatSync(current,{throwIfNoEntry:false});if(info?.isSymbolicLink() || info?.isFile()&&info.nlink>1)throw Error('Linked packaging path refused');}
}
function outputNames(path='') {
  for(const item of readdirSync(join(output,path),{withFileTypes:true})) {const name=path?path+'/'+item.name:item.name;noLinks(output,name);
    if(item.isDirectory()&&folders.has(name))outputNames(name);
    else if(!item.isFile()||!allowed.has(name))throw Error('Unexpected Vercel gateway output retained; packaging stopped');
  }
}
export function auditGateway(map,permitted=allowed) {
  const secret=/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|\b(?:sb_secret_|sk[-_]|sk-proj-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}|postgres(?:ql)?:\/\/[^\s'"]+/;
  for(const [path,bytes]of map) {const text=bytes.toString('utf8');
    // The reused public packager contains this one reviewed audit expression.
    const mapText=path==='scripts/static-package.js'?text.replace(/sourceMappingURL(?=\|\\bFixture\\b\|phase8Probe\|https\?:)/,'reviewed_map_check'):text;
    if(secret.test(text)||/sourceMappingURL/.test(mapText))throw Error('Sensitive or unexpected Vercel gateway content');
    if(!path.endsWith('.js'))continue;
    const imports=[...text.matchAll(/\bimport\s+(?:[^;]*?\s+from\s*)?(['"])([^'"]+)\1/g),...text.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].map(match=>match[2]);
    if([...text.matchAll(/\bimport\s*\(/g)].length!==[...text.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].length)throw Error('Computed gateway import refused');
    for(const specifier of imports) {if(specifier.startsWith('node:') || ['cloud/server.js','cloud/vercel.js'].includes(path)&&specifier==='pg')continue;
      const url=new URL(specifier,'https://vercel-gateway-package.invalid/'+path);if(!specifier.startsWith('.')||url.origin!=='https://vercel-gateway-package.invalid'||!permitted.has(url.pathname.slice(1)))throw Error('Unapproved gateway import');
    }
  }
}
export function gatewayArtifact(root) {
  noLinks(root);const expected=new Map();
  for(const path of sources) {noLinks(root,path);expected.set(path,readFileSync(join(root,path)));}
  for(const path of ['cloud/package.json','cloud/package-lock.json'])noLinks(root,path);
  const cloudPackage=JSON.parse(readFileSync(join(root,'cloud/package.json'))),lock=JSON.parse(readFileSync(join(root,'cloud/package-lock.json')));
  if(JSON.stringify(cloudPackage.dependencies)!==JSON.stringify({pg:'8.23.1'}) || lock.lockfileVersion!==3 || lock.packages['node_modules/pg']?.version!=='8.23.1')throw Error('Unreviewed runtime dependencies');
  const pkg={name:'tracker-preview-gateway',private:true,type:'module',engines:{node:'24.x'},dependencies:cloudPackage.dependencies};
  const packages=Object.fromEntries(Object.entries(lock.packages).filter(([path,value])=>path!==''&&!value.dev));
  packages['']={name:pkg.name,dependencies:pkg.dependencies,engines:pkg.engines};
  expected.set('package.json',Buffer.from(JSON.stringify(pkg,null,2)+'\n'));
  expected.set('package-lock.json',Buffer.from(JSON.stringify({...lock,name:pkg.name,packages},null,2)+'\n'));
  expected.set('api/gateway.js',Buffer.from("import handler from '../cloud/vercel.js';\nexport default handler;\n"));
  const config={framework:null,installCommand:'npm ci --omit=dev',buildCommand:'node --input-type=module -e "import {mkdirSync} from \'node:fs\'; mkdirSync(\'public\',{recursive:true})"',outputDirectory:'public',functions:{'api/gateway.js':{maxDuration:60,supportsCancellation:true,includeFiles}},rewrites:[{source:'/:path*',destination:'/api/gateway'}]};
  expected.set('vercel.json',Buffer.from(JSON.stringify(config,null,2)+'\n'));
  auditGateway(expected);return expected;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) try {
  const args=process.argv.slice(2);if(args.length>1||args.some(arg=>!['--check','--inventory'].includes(arg)))throw Error('Usage: vercel-gateway-package.js [--check|--inventory]');
  const expected=gatewayArtifact(root);
  noLinks(root,relativeOutput);if(existsSync(output))outputNames();
  if(!args.length)for(const [path,bytes]of expected) {noLinks(output,path);mkdirSync(dirname(join(output,path)),{recursive:true});writeFileSync(join(output,path),bytes);}
  outputNames();const actual=new Map();for(const path of paths) {noLinks(output,path);actual.set(path,readFileSync(join(output,path)));}auditGateway(actual);
  const inventory=paths.map(path=>{const bytes=actual.get(path);if(sha(bytes)!==sha(expected.get(path)))throw Error('Vercel gateway artifact differs from reviewed source');return {path,bytes:bytes.length,sha256:sha(bytes)};});
  console.log(args[0]==='--inventory'?JSON.stringify(inventory,null,2):`PASS: ${inventory.length} approved Vercel gateway files; imports/privacy/hash checks passed. Output: ${relativeOutput}`);
} catch(error) {console.error(`Vercel gateway packaging rejected: ${error.code || error.message}; values redacted.`);process.exitCode=1;}
