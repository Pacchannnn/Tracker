// Local packaging only. Does not install dependencies, connect or deploy.
import {readFileSync,writeFileSync,lstatSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.cwd()), output=join(root,'gateway-dist');
const paths=['cloud/server.js','cloud/gateway.js','cloud/package.json','cloud/package-lock.json','js/data.js','js/custom-workout.js','js/program.js','js/session-identity.js','js/planning-draft.js','js/planner.js','js/cloud-records.js','package.json'].sort();
const allowed=new Set(paths),folders=new Set(['cloud','js']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function noLinks(base,path=''){
  let current=base;
  for(const part of ['',...path.split('/').filter(Boolean)]){if(part)current=join(current,part);const info=lstatSync(current,{throwIfNoEntry:false});if(info?.isSymbolicLink() || info?.isFile()&&info.nlink>1)throw Error('Linked packaging path refused');}
}
function outputNames(path=''){
  for(const item of readdirSync(join(output,path),{withFileTypes:true})){const name=path?path+'/'+item.name:item.name;noLinks(output,name);
    if(item.isDirectory()&&folders.has(name))outputNames(name);
    else if(!item.isFile()||!allowed.has(name))throw Error('Unexpected gateway output retained; packaging stopped');
  }
}
function audit(map){
  const secret=/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|\b(?:sb_secret_|sk[-_]|sk-proj-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}|postgres(?:ql)?:\/\/[^\s'"]+/;
  for(const [path,bytes]of map){const text=bytes.toString('utf8');if(secret.test(text)||/sourceMappingURL/.test(text))throw Error('Sensitive or unexpected gateway content; values redacted');
    if(!path.endsWith('.js'))continue;
    const imports=[...text.matchAll(/\bimport\s+(?:[^;]*?\s+from\s*)?(['"])([^'"]+)\1/g),...text.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].map(match=>match[2]);
    if([...text.matchAll(/\bimport\s*\(/g)].length!==[...text.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].length)throw Error('Computed gateway import refused');
    for(const specifier of imports){if(specifier.startsWith('node:')||path==='cloud/server.js'&&specifier==='pg')continue;
      const url=new URL(specifier,'https://gateway-package.invalid/'+path);if(!specifier.startsWith('.')||url.origin!=='https://gateway-package.invalid'||!allowed.has(url.pathname.slice(1)))throw Error('Unapproved gateway import');
    }
  }
}
try{
  const args=process.argv.slice(2);if(args.length>1||args.some(arg=>!['--check','--inventory'].includes(arg)))throw Error('Usage: gateway-package.js [--check|--inventory]');
  noLinks(root);const expected=new Map();
  for(const path of paths){if(path==='package.json'){expected.set(path,Buffer.from('{"private":true,"type":"module"}\n'));continue;}noLinks(root,path);expected.set(path,readFileSync(join(root,path)));}
  audit(expected);noLinks(root,'gateway-dist');if(existsSync(output))outputNames();
  if(!args.length)for(const [path,bytes]of expected){noLinks(output,path);mkdirSync(dirname(join(output,path)),{recursive:true});writeFileSync(join(output,path),bytes);}
  outputNames();const actual=new Map();for(const path of paths){noLinks(output,path);actual.set(path,readFileSync(join(output,path)));}audit(actual);
  const inventory=paths.map(path=>{const bytes=actual.get(path);if(sha(bytes)!==sha(expected.get(path)))throw Error('Gateway artifact differs from reviewed source');return {path,bytes:bytes.length,sha256:sha(bytes)};});
  console.log(args[0]==='--inventory'?JSON.stringify(inventory,null,2):`PASS: ${inventory.length} approved gateway files; imports/privacy/hash checks passed. Output: gateway-dist`);
}catch(error){console.error(`Gateway packaging rejected: ${error.code || error.message}; values redacted.`);process.exitCode=1;}
