// Disposable synthetic browser fixtures. Never serve the repository or user origin.
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { representativeState } from '../../tests/fixtures/representative-state.js';
// Windows URL paths may contain percent-encoded spaces.
const { fileURLToPath } = await import('node:url');
const repository = fileURLToPath(new URL('../../', import.meta.url));
const dist = join(repository, 'dist'), servers = [];
const anon = JSON.stringify(representativeState());
async function copyRuntime(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw Error('linked_fixture_refused');
    if (entry.isDirectory()) await copyRuntime(join(from, entry.name), join(to, entry.name));
    else await copyFile(join(from, entry.name), join(to, entry.name));
  }
}
export function prepareQaEntry(html) {
  const entries=[...html.matchAll(/src="(js\/app\.js\?v=\d+)"/g)];
  if(entries.length!==1)throw Error('unrecognized_qa_entry');
  return {html:html.replace(entries[0][0],'src="qa.js"'),appSpecifier:'./'+entries[0][1]};
}
function fixture(deviceId, gatewayPort, appSpecifier) {
  return `import { putPhoto } from './js/photo-store.js?v=41';
const nativeFetch = globalThis.fetch.bind(globalThis);
let offline = localStorage.getItem('qa-offline') === 'yes', lost = false, external = 0, errors = 0;
let delayed = null, shortSession = false, rejectRefresh = false;
const bar = document.createElement('aside'); bar.id='synthetic-fixture';
bar.style.cssText='padding:8px;background:#eef6ef;font:12px monospace;overflow-wrap:anywhere';
const controls=document.createElement('div'), report=document.createElement('pre');report.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';bar.append(controls,report);document.body.prepend(bar);
function control(text,fn){const b=document.createElement('button');b.textContent=text;b.type='button';b.onclick=fn;controls.append(b);return b;}
const toggle=control('QA: Offline '+(offline?'ON':'OFF'),()=>{offline=!offline;localStorage.setItem('qa-offline',offline?'yes':'no');toggle.textContent='QA: Offline '+(offline?'ON':'OFF');});
control('QA: Lose next push ACK',()=>{lost=true;});
control('QA: Hold next gateway response',()=>{delayed={release:null};report.textContent='Next gateway response will be held.';});
control('QA: Release gateway response',()=>{delayed?.release?.();delayed=null;});
control('QA: Short session (12s, refresh denied)',()=>{shortSession=true;rejectRefresh=true;});
window.addEventListener('error',()=>{errors++;});window.addEventListener('unhandledrejection',()=>{errors++;});
const users={'synthetic-A':'11111111-1111-4111-8111-111111111111','synthetic-B':'22222222-2222-4222-8222-222222222222'};
if(!localStorage.getItem('qa-seeded')&&localStorage.getItem('vshape-tracker')!==null)throw Error('Existing data: this is not a disposable fixture origin. Nothing imported.');
const json=v=>new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const value=String(url);
 if(value.startsWith('https://syntheticqa.supabase.co/auth/v1')){
  const path=value.split('/auth/v1')[1],body=options.body?JSON.parse(options.body):{};
  if(path==='/otp'||path.startsWith('/logout'))return json({});
  if(path==='/verify'||path.startsWith('/token')){if(path.startsWith('/token')&&rejectRefresh){await new Promise(resolve=>setTimeout(resolve,15000));throw Error('synthetic refresh rejected');}const token=(body.email||body.refresh_token||'').includes('b@')||body.refresh_token==='synthetic-B'?'synthetic-B':'synthetic-A';return json({access_token:token,refresh_token:token,token_type:'bearer',expires_in:shortSession?12:3600});}
  if(path==='/user'){const token=options.headers.Authorization.slice(7);return json({id:users[token],email:token==='synthetic-B'?'b@example.invalid':'a@example.invalid',email_confirmed_at:'2026-10-09T00:00:00Z',is_anonymous:false,role:'authenticated',aud:'authenticated'});}
  throw Error('unknown fixture auth route');
 }
 if(value.startsWith('https://gateway.synthetic.invalid/')){
  if(offline)throw Error('synthetic offline');
  const response=await nativeFetch('http://127.0.0.1:${gatewayPort}/'+value.split('/').pop(),options);
  if(delayed){const held=delayed;await new Promise(resolve=>{held.release=resolve;report.textContent='Gateway response held; use release control.';});}
  if(lost&&value.endsWith('/push')){lost=false;await response.text();throw Error('synthetic lost ACK');}return response;
 }
 if(value.startsWith('https://syntheticqa.supabase.co/storage/v1/object/')){
  if(offline)throw Error('synthetic offline');
  const path=value.split('/tracker-preview-photos/')[1];if(!path)throw Error('unknown synthetic storage');
  return nativeFetch('http://127.0.0.1:${gatewayPort}/qa-storage/'+path,options);
 }
 if(!value.startsWith(location.origin)){external++;throw Error('unapproved network fixture');}return nativeFetch(url,options);
};
function requestResult(r){return new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
const opening=indexedDB.open('tracker-sync',2);opening.onupgradeneeded=()=>{for(const name of ['workspaces','metadata','photoAssets','photoJobs','recoveryWorkspaces','importLedgers'])if(!opening.result.objectStoreNames.contains(name))opening.result.createObjectStore(name);};
const db=await requestResult(opening);await new Promise((ok,no)=>{const tx=db.transaction('metadata','readwrite');const store=tx.objectStore('metadata'),r=store.get('installation');r.onsuccess=()=>{if(!r.result)store.put({deviceId:'${deviceId}'},'installation');};tx.oncomplete=ok;tx.onabort=no;});
control('QA: Reset synthetic account cache',async()=>{
 const tx=db.transaction('workspaces','readwrite'),store=tx.objectStore('workspaces'),r=store.getAll();
 r.onsuccess=()=>{if(!localStorage.getItem('qa-seeded')||r.result.some(row=>row.scope.environment!=='preview'||row.scope.projectId!=='syntheticqa'||!Object.values(users).includes(row.scope.uid))){tx.abort();report.textContent='Reset refused: unexpected scope or missing synthetic marker.';return;}store.clear();};
 tx.oncomplete=()=>{localStorage.removeItem('qa-offline');location.reload();};
 tx.onabort=()=>{report.textContent='Reset refused. No rows removed.';};
});
if(!localStorage.getItem('qa-seeded')){localStorage.setItem('vshape-tracker',${JSON.stringify(anon)});localStorage.setItem('qa-seeded','yes');const blob=new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'});await putPhoto({id:'anonymous-photo',date:'2026-10-04',category:'daily',pose:'',weight:null,waist:null,note:'synthetic only',blob,thumbnail:blob,createdAt:'2026-10-04T00:00:00Z',updatedAt:'2026-10-04T00:00:00Z'});}
const initialAnon=localStorage.getItem('vshape-tracker');
async function diagnostics(){const tx=db.transaction('workspaces','readonly'),rows=await requestResult(tx.objectStore('workspaces').getAll());report.textContent=JSON.stringify({fixture:'synthetic only',device:'${deviceId}',offline,external,errors,anonymousUnchanged:localStorage.getItem('vshape-tracker')===initialAnon,workspaces:rows.map(r=>({uid:r.scope.uid,revision:r.localRevision,cursor:r.cursor,outbox:r.outbox.length,conflicts:r.conflicts.filter(c=>c.status==='unresolved').length,foods:r.data.foods.length,sessions:r.data.sessions.length,journal:r.data.journalEntries.length}))});}
control('QA: Read storage diagnostics',()=>diagnostics());setInterval(()=>diagnostics().catch(()=>{}),1000);
control('QA: Download synthetic workspace evidence',async()=>{
 const tx=db.transaction('workspaces','readonly'),rows=await requestResult(tx.objectStore('workspaces').getAll());
 if(!localStorage.getItem('qa-seeded')||rows.some(row=>row.scope.environment!=='preview'||row.scope.projectId!=='syntheticqa'||!Object.values(users).includes(row.scope.uid)))throw Error('Evidence refused: unexpected scope');
 const blob=new Blob([JSON.stringify({syntheticOnly:true,device:'${deviceId}',anonymous:localStorage.getItem('vshape-tracker'),rows},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='synthetic-evidence-${gatewayPort}.json';a.textContent='Download synthetic evidence';controls.append(a);
});
await import(${JSON.stringify(appSpecifier)});await diagnostics();`;
}
async function main() {
for (const [port, device, gateway] of [[8840,'33333333-3333-4333-8333-333333333333',8842],[8841,'44444444-4444-4444-8444-444444444444',8843],[8844,null,null],[8846,null,null]]) {
  const directory = join(repository,'.local',`batch2-${port}`); await copyRuntime(dist,directory);
  if (device) {
    await writeFile(join(directory,'js/cloud-config.js'), "export const CLOUD_AUTH_CONFIG=Object.freeze({enabled:true,environment:'preview',projectUrl:'https://syntheticqa.supabase.co',publishableKey:'sb_publishable_SYNTHETIC',gatewayUrl:'https://gateway.synthetic.invalid'});\n");
    const entry=prepareQaEntry(await readFile(join(directory,'index.html'),'utf8'));
    await writeFile(join(directory,'index.html'),entry.html);
    await writeFile(join(directory,'qa.js'),fixture(device,gateway,entry.appSpecifier));
  }
  const server=http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(directory,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(directory+'\\')&&!file.startsWith(directory+'/'))throw Error();const bytes=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'}[extname(file)]||'application/octet-stream'),'Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}});
  await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});servers.push(server);process.stdout.write(`Synthetic/static fixture ready http://127.0.0.1:${port}\n`);
}
process.stdin.resume();process.stdin.on('data',()=>{for(const server of servers)server.close();process.exit(0);});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
