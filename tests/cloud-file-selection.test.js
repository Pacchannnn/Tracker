import test from 'node:test';
import assert from 'node:assert/strict';
import {createImportUI} from '../js/cloud-import-ui.js';
import {createRecoveryUI} from '../js/cloud-recovery-ui.js';
class Element{
 constructor(tag,props={}){this.tag=tag;Object.assign(this,props);this.children=[];this.listeners={};this.isConnected=true;}
 append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}
 addEventListener(type,fn){this.listeners[type]=fn;}
 querySelector(selector){return all(this).find(child=>child.tag===selector);}
}
const all=root=>[root,...root.children.flatMap(child=>child instanceof Element?all(child):[])];
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
function helpers(){const node=(tag,props)=>new Element(tag,props);return {node,button:(text,callback)=>{const item=node('button',{text});item.listeners.click=callback;return item;},panel:(...items)=>{const box=node('section');box.append(...items);return box;},div:(...items)=>{const box=node('div');box.append(...items.filter(item=>item instanceof Element));return box;},p:text=>node('p',{text}),h2:text=>node('h2',{text}),field:(label,name,value,props)=>{const box=node('label',{text:label});box.append(node('input',{name,value,checked:false,...props}));return box;},message(){},confirmAction(){}};}
const choose=(input,text)=>input.listeners.change({target:{files:[{size:1,text:()=>text}]}});
test('import cannot prepare while a selected optional photo file is still reading',async()=>{
 const prepared=[],ui=createImportUI({workspace:{read:()=>({epoch:1}),importer:()=>({prepare:async(...args)=>{prepared.push(args);return {id:'x',state:'review',batches:[],acceptedReceipts:[],preview:{candidates:[]},unresolved:[]};}})},helpers:helpers()});
 const box=ui.render(),input=kind=>all(box).find(e=>e.name==='import-'+kind),slow=deferred();
 all(box).find(e=>e.name==='import-consent').checked=true;
 await choose(input('source'),Promise.resolve('SOURCE'));const reading=choose(input('photos'),slow.promise);
 const prepare=()=>all(box).find(e=>e.text==='Chuẩn bị ledger từ file').listeners.click();
 await prepare();assert.equal(prepared.length,0);
 slow.resolve('PHOTOS');await reading;await prepare();assert.deepEqual(prepared,[['SOURCE','PHOTOS']]);
});
test('new import file selection wins over an earlier delayed file read',async()=>{
 const prepared=[],ui=createImportUI({workspace:{read:()=>({epoch:1}),importer:()=>({prepare:async source=>{prepared.push(source);return {id:'x',state:'review',batches:[],acceptedReceipts:[],preview:{candidates:[]},unresolved:[]};}})},helpers:helpers()});
 const box=ui.render(),input=all(box).find(e=>e.name==='import-source'),old=deferred();
 all(box).find(e=>e.name==='import-consent').checked=true;
 const first=choose(input,old.promise);await choose(input,Promise.resolve('B'));old.resolve('A');await first;
 await all(box).find(e=>e.text==='Chuẩn bị ledger từ file').listeners.click();
 assert.deepEqual(prepared,['B']);
});
test('recovery preview completion cannot bind files selected after that preview began',async()=>{
 const old=deferred(),reviewed=[],ui=createRecoveryUI({workspace:{read:()=>({epoch:1,cached:true}),recovery:()=>({preview:files=>{reviewed.push(files);return reviewed.length===1?old.promise:Promise.resolve({manifest:{counts:{},head:'2'}});}})},helpers:helpers(),registerUrl(){}});
 const box=ui.render(),input=kind=>all(box).find(e=>e.name==='recovery-'+kind);
 await choose(input('manifest'),Promise.resolve('M'));await choose(input('workspace'),Promise.resolve('A'));
 const first=choose(input('photos'),Promise.resolve('P'));await new Promise(done=>setImmediate(done));
 await choose(input('workspace'),Promise.resolve('B'));old.resolve({manifest:{counts:{},head:'1'}});await first;
 const text=all(box).filter(e=>e.tag==='p').map(e=>e.text).join(' ');
 assert.ok(text.includes('Mốc server: 2.'));assert.ok(!text.includes('Mốc server: 1.'));
 assert.equal(reviewed[0].workspace,'A');assert.equal(reviewed[1].workspace,'B');
});
