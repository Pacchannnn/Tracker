import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';

// Only the DOM and external reads are adapted; period/domain derivation is real.
class Element {
  constructor(tag,doc) { this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.listeners={};this.style={};this._text='';this.parentNode=null; }
  get textContent() { return this._text+this.children.map(x=>x.textContent).join(' '); }
  set textContent(value) { this._text=String(value);this.children.forEach(x=>x.parentNode=null);this.children=[]; }
  get isConnected() { return this.root||!!this.parentNode?.isConnected; }
  append(...items) { for(const item of items) {item.remove?.();item.parentNode=this;this.children.push(item);} }
  replaceChildren(...items) {this.children.forEach(x=>x.parentNode=null);this.children=[];this._text='';this.append(...items);}
  remove() {if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}
  setAttribute(key,value) {this.attributes[key]=String(value);if(key==='name')this.name=String(value);}
  getAttribute(key) {return this.attributes[key]??null;}
  addEventListener(type,fn) {(this.listeners[type]??=[]).push(fn);}
  dispatch(type) {for(const fn of this.listeners[type]??[])fn({target:this});}
  click() {if(!this.disabled)this.dispatch('click');}
  focus() {this.ownerDocument.activeElement=this;this.ownerDocument.dispatch?.('focusin',{target:this});}
  scrollIntoView() {}
  querySelector(selector) {return all(this).find(el=>selector==='input'?el.tagName==='input':selector.startsWith('[name=')?el.name===selector.match(/"([^"]+)"/)[1]:false)??null;}
}
function all(root) {return root.children.flatMap(x=>[x,...all(x)]);}
function dom() {
  const images=[]; const doc={activeElement:null,listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]??[]).filter(x=>x!==fn);},dispatch(type,event){for(const fn of this.listeners[type]??[])fn(event);},defaultView:{scrollY:0,scrollTo({top}){this.scrollY=top;}}};
  const node=(tag,options={},children=[])=>{const el=new Element(tag,doc);if(tag==='img')images.push(el);for(const [key,value] of Object.entries(options)){if(key==='text')el.textContent=value;else if(key==='onClick')el.addEventListener('click',value);else if(key==='value')el.value=value;else el.setAttribute(key,value);}el.append(...children);return el;};
  const helpers={node,button:(label,fn)=>node('button',{text:label,onClick:fn}),p:text=>node('p',{text}),h2:text=>node('h2',{text}),h3:text=>node('h3',{text}),div:(cls,...items)=>node('div',{class:cls},items),panel:(...items)=>node('section',{},items),fmt:String,field:(label,name,value,options)=>node('label',{},[node('span',{text:label}),node('input',{name,value,...options})])};
  const main=node('main');main.root=true;return {main,helpers,doc,images};
}
const imported=await import('../js/month-memories-ui.js').catch(()=>({}));
const photo=(id,date='2026-10-05')=>({id,date,category:'daily',pose:'front',weight:null,waist:null,note:'Recorded photo',createdAt:'',updatedAt:''});
const journal=(id,date='2026-10-05',mood='drained')=>({id,date,mood,title:'Recorded title',note:'Recorded note',tags:['Đi bộ']});
const blob=()=>new Blob(['image'],{type:'image/png'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function create(options={}) {
  assert.equal(typeof imported.createMonthMemoriesUI,'function','Monthly Memories UI interface must exist');
  const env=dom(),opened=[],reads={metadata:0,thumbnail:[],original:[]},urls={created:[],revoked:[]};
  const ui=imported.createMonthMemoriesUI({...env,readData:()=>({status:'available',data:emptyData()}),readMetadata:async()=>{reads.metadata++;return [photo('p')];},readThumbnail:async id=>{reads.thumbnail.push(id);return blob();},readOriginal:async id=>{reads.original.push(id);return {...photo(id),blob:blob()};},today:()=> '2026-10-06',openSource:(ref,context)=>opened.push({ref,context}),openDay:(date,context)=>opened.push({date,context}),urlAPI:{createObjectURL(value){const url=`blob:test-${urls.created.length}`;urls.created.push({url,value});return url;},revokeObjectURL(url){urls.revoked.push(url);}},...options});
  return {...env,opened,reads,urls,ui};
}
const btn=(main,label)=>all(main).find(x=>x.tagName==='button'&&x.textContent===label);
const action=(main,kind)=>all(main).find(x=>x.getAttribute('data-memory-action')===kind);
const source=(main,id)=>all(main).find(x=>x.getAttribute('data-memory-source')===id);
const image=(main)=>all(main).find(x=>x.tagName==='img');
async function open(env) {action(env.main,'thumbnail').click();await flush();return env;}

test('initial monthly view reads metadata but never image variants and keeps full-month counts',async()=>{
  const env=create();await env.ui.renderView();assert.equal(env.reads.metadata,1);assert.deepEqual(env.reads.thumbnail,[]);assert.deepEqual(env.reads.original,[]);assert.equal(env.urls.created.length,0);
  assert.match(env.main.textContent,/Ký ức tháng.*2026-10-01.*2026-10-31/);assert.match(env.main.textContent,/Ảnh.*1 bản ghi trong tháng/);assert.match(env.main.textContent,/1\/6 ngày đến hạn/);
  assert.equal(action(env.main,'thumbnail').textContent,'Mở ảnh');assert.match(action(env.main,'thumbnail').getAttribute('aria-label'),/2026-10-05.*ID p/);
});

test('chronological semantic timeline renders exact factual previews and source identities',async()=>{
  const data=emptyData();data.journalEntries=[journal('later','2026-10-08','bright'),journal('j')];data.sessions=[{id:'w',date:'2026-10-05',workout:'A',week:1,sets:[]}];data.entries=[{id:'n',date:'2026-10-05',meal:'Lunch',foodId:'gone',food:{name:'Saved food',serving:'100g',calories:null,protein:0,carbs:1,fat:2},servings:2}];
  const env=create({readData:()=>({status:'available',data})});await env.ui.renderView();const days=all(env.main).filter(x=>x.tagName==='li'&&x.getAttribute('data-memory-date')&&!x.getAttribute('data-memory-kind'));
  assert.deepEqual(days.map(x=>x.getAttribute('data-memory-date')),['2026-10-05','2026-10-08']);assert.match(days[1].textContent,/Bản ghi có ngày sau hôm nay/);
  const roots=all(days[0]).filter(x=>x.getAttribute('data-memory-kind'));assert.deepEqual(roots.map(x=>x.getAttribute('data-memory-kind')),['journal','workout','nutrition','photo']);
  assert.equal(roots[0].getAttribute('data-memory-id'),'j');assert.match(roots[0].textContent,/Mệt.*Recorded note.*Thẻ hoạt động do bạn ghi.*Đi bộ/);assert.match(roots[1].textContent,/0 hiệp đã lưu/);assert.match(roots[2].textContent,/Saved food.*100g.*2.*Lunch/);
  assert.doesNotMatch(roots[2].textContent,/Calories|Protein|kcal/);assert.equal(source(env.main,'j').textContent,'Mở nguồn · Nhật ký · 2026-10-05 · ID j');
});

test('coverage includes all eight textual denominators and preserves unavailable versus blank mood',async()=>{
  const data=emptyData();data.journalEntries=[journal('j','2026-10-05','alien')];const env=create({readData:()=>({status:'available',data})});await env.ui.renderView();
  for(const label of ['Nhật ký','Tâm trạng','Dinh dưỡng','Tập luyện','Cardio','Check-in','Gối','Ảnh'])assert.match(env.main.textContent,new RegExp(label));
  assert.match(env.main.textContent,/Chưa đọc được Tâm trạng/);assert.doesNotMatch(env.main.textContent,/Bình thường/);
  data.journalEntries[0].mood='';await env.ui.renderView();assert.match(env.main.textContent,/Tâm trạng: Chưa ghi/);assert.doesNotMatch(env.main.textContent,/Chưa đọc được Tâm trạng/);
});

test('current and future periods label eligibility without 0/0 and future records prevent false emptiness',async()=>{
  const env=create({readMetadata:async()=>[photo('future','2026-11-05')]});await env.ui.renderView();env.ui.select('2026-11-08');await flush();assert.match(env.main.textContent,/Khoảng này chưa có ngày đến hạn/);assert.match(env.main.textContent,/Bản ghi có ngày sau hôm nay/);assert.doesNotMatch(env.main.textContent,/0\/0|Chưa có dữ liệu được ghi trong khoảng này/);
});

test('all-readable empty period and partial read errors have distinct scoped certainty',async()=>{
  const empty=create({readMetadata:async()=>[]});await empty.ui.renderView();assert.match(empty.main.textContent,/Chưa có dữ liệu được ghi trong khoảng này/);
  const failed=create({readMetadata:async()=>{throw Error('PRIVATE');}});await failed.ui.renderView();assert.match(failed.main.textContent,/Chưa xác định.*trống/);assert.match(failed.main.textContent,/Chưa đọc được kho ảnh/);assert.doesNotMatch(failed.main.textContent,/PRIVATE|Chưa có dữ liệu được ghi trong khoảng này/);
  const json=create({readData:()=>{throw Error('SECRET');}});await json.ui.renderView();assert.match(json.main.textContent,/Chưa đọc được dữ liệu JSON/);assert.ok(action(json.main,'thumbnail'));assert.doesNotMatch(json.main.textContent,/SECRET/);
});

test('month control accepts YYYY-MM while public selection requires exact full dates and retains invalid selection',async()=>{
  const env=create();await env.ui.renderView();let input=env.main.querySelector('[name="monthMemoriesMonth"]');assert.equal(input.getAttribute('type'),'month');assert.equal(input.value,'2026-10');
  input.focus();input.value='';input.dispatch('change');await flush();assert.equal(env.ui.getContext().monthAnchor,'2026-10-01');assert.equal(input.getAttribute('aria-invalid'),'true');assert.equal(env.doc.activeElement,input);
  assert.equal(env.ui.select('2026-11'),false);input.value='2026-11';input.dispatch('change');await flush();assert.equal(env.ui.getContext().monthAnchor,'2026-11-01');
  assert.equal(env.ui.select('not-a-date'),false);assert.equal(env.ui.getContext().monthAnchor,'2026-11-01');
});

test('previous next current and refresh capture local today once and restore controls immediately',async()=>{
  const pending=[];let now='2026-10-06',clock=0;const env=create({today:()=>{clock++;return now;},readMetadata:()=>{const item=deferred();pending.push(item);return item.promise;}});
  const initial=env.ui.renderView();pending.shift().resolve([]);await initial;
  for(const [label,name,want] of [['← Tháng trước','monthMemoriesPrevious','2026-09-01'],['Tháng sau →','monthMemoriesNext','2026-10-01'],['Làm mới','monthMemoriesRefresh','2026-10-01']]){
    btn(env.main,label).focus();btn(env.main,label).click();assert.equal(env.doc.activeElement.getAttribute('name'),name);assert.equal(env.doc.activeElement.isConnected,true);assert.equal(env.ui.getContext().monthAnchor,want);
    const other=env.main.querySelector('[name="monthMemoriesMonth"]');other.focus();pending.shift().resolve([]);await flush();assert.equal(env.doc.activeElement,other);
  }
  now='2026-11-01';btn(env.main,'Tháng hiện tại').focus();btn(env.main,'Tháng hiện tại').click();pending.shift().resolve([]);await flush();assert.equal(env.ui.getContext().monthAnchor,'2026-11-01');assert.equal(clock,5);
});

test('source callbacks preserve exact date/ref month context and Back rederives latest source',async()=>{
  let data=emptyData(),reads=0;data.journalEntries=[journal('j')];const env=create({readData:()=>{reads++;return {status:'available',data};}});await env.ui.renderView();source(env.main,'j').focus();env.doc.defaultView.scrollY=87;source(env.main,'j').click();
  const {ref,context}=env.opened[0];assert.deepEqual(ref,{kind:'journal',id:'j',date:'2026-10-05'});assert.equal(context.mode,'month');assert.equal(context.monthAnchor,'2026-10-01');assert.equal(context.originatingDate,'2026-10-05');assert.deepEqual(context.originatingRef,ref);assert.equal(context.scrollPosition,87);
  env.ui.invalidate();env.main.replaceChildren();data.journalEntries[0].title='Latest title';env.ui.returnTo(context);await env.ui.renderView();assert.match(env.main.textContent,/Latest title/);assert.match(env.doc.activeElement.textContent,/ID j/);assert.equal(reads,2);assert.equal(env.doc.defaultView.scrollY,87);
});

test('source deletion returns focus to date then timeline fallback',async()=>{
  const data=emptyData();data.journalEntries=[journal('j')];const env=create({readData:()=>({status:'available',data})});await env.ui.renderView();source(env.main,'j').click();const context=env.opened[0].context;data.journalEntries=[];
  env.ui.invalidate();env.main.replaceChildren();env.ui.returnTo(context);await env.ui.renderView();assert.equal(env.doc.activeElement.textContent,'2026-10-05');
  env.ui.invalidate();env.main.replaceChildren();env.ui.returnTo({...context,originatingDate:'2026-10-09',originatingRef:{...context.originatingRef,date:'2026-10-09'}});await env.ui.renderView();assert.equal(env.doc.activeElement.textContent,'Dòng thời gian');
});

test('day navigation offers exact dates for absent coverage without inventing records',async()=>{
  const env=create({readMetadata:async()=>[]});await env.ui.renderView();btn(env.main,'Xem ngày · 2026-10-01').click();assert.equal(env.opened[0].date,'2026-10-01');assert.equal(env.opened[0].context.originatingDate,'2026-10-01');
});

test('latest metadata is resolved before selected thumbnail and full image is a separate explicit action',async()=>{
  const env=create();await env.ui.renderView();await open(env);assert.equal(env.reads.metadata,2);assert.deepEqual(env.reads.thumbnail,['p']);assert.deepEqual(env.reads.original,[]);assert.equal(env.urls.created.length,1);assert.equal(env.opened.length,0);
  // The candidate image is decoded before it replaces an in-use image.
  env.images[0].dispatch('load');
  action(env.main,'original').click();await flush();assert.deepEqual(env.reads.original,['p']);assert.equal(env.reads.metadata,3);assert.match(action(env.main,'original').getAttribute('aria-label'),/2026-10-05.*ID p/);
});

test('photo evidence source opens only that inline photo rather than a bulk route',async()=>{
  const env=create();await env.ui.renderView();source(env.main,'p').click();await flush();assert.deepEqual(env.reads.thumbnail,['p']);assert.equal(env.opened.length,0);
});

test('missing unreadable thumbnail reports scoped error with no original fallback and unchanged count',async()=>{
  for(const readThumbnail of [async()=>null,async()=>{throw Error('PRIVATE IMAGE');}]){const env=create({readThumbnail});await env.ui.renderView();await open(env);assert.match(env.main.textContent,/Chưa đọc được ảnh thu nhỏ|Không còn ảnh thu nhỏ/);assert.match(env.main.textContent,/1 bản ghi trong tháng/);assert.deepEqual(env.reads.original,[]);assert.equal(env.urls.created.length,0);assert.doesNotMatch(env.main.textContent,/PRIVATE IMAGE/);}
});

test('deleted moved or ambiguous metadata never reads the old photo identity',async()=>{
  for(const latest of [[],[photo('p','2026-10-07')],[photo('p'),photo('p')]]){let reads=0;const env=create({readMetadata:async()=>++reads===1?[photo('p')]:latest});await env.ui.renderView();await open(env);assert.deepEqual(env.reads.thumbnail,[]);assert.match(env.main.textContent,/Bản ghi đã thay đổi hoặc không còn ở ngày này/);assert.match(env.main.textContent,/1 bản ghi trong tháng/);}
});

test('original lookup validates selected id date and nonempty Blob before creating a URL',async()=>{
  for(const result of [null,undefined,{...photo('wrong'),blob:blob()},{...photo('p','2026-10-07'),blob:blob()},{...photo('p'),blob:'not-a-blob'},{...photo('p'),blob:new Blob()}]){
    const env=create({readThumbnail:async()=>null,readOriginal:async()=>result});await env.ui.renderView();await open(env);action(env.main,'original').click();await flush();assert.equal(env.urls.created.length,0);assert.match(env.main.textContent,/Chưa đọc được ảnh đầy đủ|Bản ghi đã thay đổi/);
  }
});

test('late metadata cannot overwrite month or append after invalidation',async()=>{
  const pending=[];const env=create({readMetadata:()=>{const item=deferred();pending.push(item);return item.promise;}});const first=env.ui.renderView();env.ui.select('2026-11-01');pending[1].resolve([photo('new','2026-11-02')]);await flush();pending[0].resolve([photo('old')]);await first;assert.match(env.main.textContent,/ID new/);assert.doesNotMatch(env.main.textContent,/ID old/);
  const late=env.ui.renderView();env.ui.invalidate();env.main.replaceChildren();pending[2].resolve([photo('late','2026-11-03')]);await late;assert.equal(env.main.textContent,'');
});

test('out of order thumbnail reads only display the most recently selected image',async()=>{
  const pending=[];const images=[];const env=create({readMetadata:async()=>[photo('a'),photo('b')],readThumbnail:id=>{const item=deferred();pending.push({id,...item});return item.promise;}});
  await env.ui.renderView();const buttons=all(env.main).filter(x=>x.getAttribute('data-memory-action')==='thumbnail');buttons[0].click();await flush();buttons[1].click();await flush();pending[1].resolve(blob());await flush();assert.equal(env.images.length,1);env.images[0].dispatch('load');pending[0].resolve(blob());await flush();assert.equal(env.urls.created.length,1);assert.match(image(env.main).getAttribute('alt'),/ID b/);
});

test('out of order originals cannot replace newer selection or steal keyboard focus',async()=>{
  const pending=[];const images=[];const env=create({readThumbnail:async()=>null,readOriginal:()=>{const item=deferred();pending.push(item);return item.promise;}});await env.ui.renderView();await open(env);
  action(env.main,'original').click();await flush();action(env.main,'original').click();await flush();const input=env.main.querySelector('[name="monthMemoriesMonth"]');input.focus();pending[1].resolve({...photo('p'),blob:blob()});await flush();env.images[0].dispatch('load');pending[0].resolve({...photo('p'),blob:blob()});await flush();assert.equal(env.urls.created.length,1);assert.equal(env.doc.activeElement,input);
});

test('replacement preserves in-use URL until image load then revokes exactly once; close restores exact opener',async()=>{
  const images=[];const env=create();await env.ui.renderView();const opener=action(env.main,'thumbnail');await open(env);env.images[0].dispatch('load');assert.equal(image(env.main),env.images[0]);action(env.main,'original').click();await flush();assert.deepEqual(env.urls.revoked,[]);assert.equal(image(env.main),env.images[0]);env.images[1].dispatch('load');assert.deepEqual(env.urls.revoked,['blob:test-0']);assert.equal(image(env.main),env.images[1]);action(env.main,'close').click();assert.deepEqual(env.urls.revoked,['blob:test-0','blob:test-1']);assert.equal(env.doc.activeElement,opener);assert.equal(image(env.main),undefined);
});

test('candidate image error retains old image and active image error revokes its URL with scoped status',async()=>{
  const images=[];const env=create();await env.ui.renderView();await open(env);env.images[0].dispatch('load');action(env.main,'original').click();await flush();env.images[1].dispatch('error');assert.equal(image(env.main),env.images[0]);assert.deepEqual(env.urls.revoked,['blob:test-1']);env.images[0].dispatch('error');assert.deepEqual(env.urls.revoked,['blob:test-1','blob:test-0']);assert.equal(image(env.main),undefined);assert.match(env.main.textContent,/Chưa đọc được ảnh/);assert.match(env.main.textContent,/1 bản ghi trong tháng/);
});

test('pending close invalidation refresh and month switch cancel reads and revoke owned URLs',async()=>{
  for(const exit of ['close','invalidate','refresh','month']){
    const images=[];const pending=deferred();let calls=0;const env=create({readThumbnail:()=>++calls===1?Promise.resolve(blob()):pending.promise});await env.ui.renderView();await open(env);env.images[0].dispatch('load');action(env.main,'thumbnail').click();await flush();
    if(exit==='close')action(env.main,'close').click();else if(exit==='invalidate')env.ui.invalidate();else if(exit==='refresh')btn(env.main,'Làm mới').click();else env.ui.select('2026-11-01');
    pending.resolve(blob());await flush();assert.deepEqual(env.urls.revoked,['blob:test-0'],exit);assert.equal(env.urls.created.length,1,exit);
  }
});

test('invalidating a candidate before image completion revokes URL and ignores late load',async()=>{
  const images=[];const env=create();await env.ui.renderView();await open(env);env.ui.invalidate();env.main.replaceChildren();env.images[0].dispatch('load');assert.deepEqual(env.urls.revoked,['blob:test-0']);assert.equal(env.main.textContent,'');
});

test('metadata completion never steals focus moved by user during source return',async()=>{
  const pending=deferred();const env=create({readMetadata:()=>pending.promise});env.ui.returnTo({mode:'month',monthAnchor:'2026-10-01',originatingDate:'2026-10-05',focusKey:'missing',scrollPosition:99});const rendering=env.ui.renderView();const input=env.main.querySelector('[name="monthMemoriesMonth"]');input.focus();pending.resolve([]);await rendering;assert.equal(env.doc.activeElement,input);assert.equal(env.doc.defaultView.scrollY,0);
});

test('viewing and source return leave canonical data and metadata snapshots untouched',async()=>{
  const data=emptyData(),photos=[photo('p')];data.journalEntries=[journal('j')];const before=JSON.stringify({data,photos});const env=create({readData:()=>({status:'available',data}),readMetadata:async()=>photos});await env.ui.renderView();await open(env);source(env.main,'j').click();env.ui.invalidate();env.ui.returnTo(env.opened[0].context);await env.ui.renderView();assert.equal(JSON.stringify({data,photos}),before);
});

test('selecting a different photo removes previous identity before pending replacement and ignores old image error',async()=>{
  const pending=deferred();const env=create({readMetadata:async()=>[photo('a'),photo('b')],readThumbnail:id=>id==='a'?Promise.resolve(blob()):pending.promise});await env.ui.renderView();
  const openers=all(env.main).filter(x=>x.getAttribute('data-memory-action')==='thumbnail');openers[0].click();await flush();env.images[0].dispatch('load');assert.match(image(env.main).getAttribute('alt'),/ID a/);
  openers[1].click();await flush();assert.equal(Boolean(image(env.main)),false,'old photo must not be relabeled beneath the new selected card');assert.deepEqual(env.urls.revoked,['blob:test-0']);
  env.images[0].dispatch('error');assert.match(env.main.textContent,/Đang đọc ảnh thu nhỏ · 2026-10-05 · ID b/);pending.resolve(blob());await flush();env.images[1].dispatch('load');assert.match(image(env.main).getAttribute('alt'),/ID b/);assert.deepEqual(env.urls.revoked,['blob:test-0']);
});

test('knee unknown and known zero details retain factual Vietnamese labels',async()=>{
  const data=emptyData();data.kneeEntries=[{id:'k',date:'2026-10-05',moment:'next-morning',pain:0,swelling:'unknown',instability:'no',stiffness:'yes',notes:'Saved detail'}];const env=create({readData:()=>({status:'available',data}),readMetadata:async()=>[]});await env.ui.renderView();
  const card=all(env.main).find(x=>x.getAttribute('data-memory-kind')==='knee');assert.match(card.textContent,/Sáng hôm sau.*Đau: 0/);assert.match(card.textContent,/Sưng: Chưa rõ.*Không vững: Không.*Cứng: Có/);assert.equal(card.children[0].tagName,'details');
});

test('close detaches the displayed image before releasing its object URL',async()=>{
  let env;const releasedWhileDisplayed=[];env=create({urlAPI:{createObjectURL:()=> 'blob:owned',revokeObjectURL(url){releasedWhileDisplayed.push(image(env.main)?.getAttribute('src')===url);}}});await env.ui.renderView();await open(env);env.images[0].dispatch('load');action(env.main,'close').click();assert.deepEqual(releasedWhileDisplayed,[false]);
});

test('source return preserves new connected external control focus and scroll while metadata is pending',async()=>{
  const pending=deferred(),data=emptyData();data.journalEntries=[journal('j')];let returning=false;const env=create({readData:()=>({status:'available',data}),readMetadata:()=>returning?pending.promise:Promise.resolve([])});const body=env.helpers.node('body');body.root=true;env.main.root=false;body.append(env.main);env.doc.body=body;
  const tab=env.helpers.button('Ký ức tháng tab',()=>{});body.append(tab);await env.ui.renderView();source(env.main,'j').click();const context={...env.opened[0].context,scrollPosition:99};
  env.ui.invalidate();env.main.replaceChildren();env.ui.returnTo(context);returning=true;const rendering=env.ui.renderView();env.main.focus();tab.focus();env.doc.defaultView.scrollY=17;pending.resolve([]);await rendering;
  assert.equal(env.doc.activeElement===tab,true,'user-selected external tab retains focus');assert.equal(env.doc.defaultView.scrollY,17);assert.equal((env.doc.listeners.focusin??[]).length,0);
});

test('automatic body or main focus during root show still permits exact source return and releases focus observer',async()=>{
  for(const automatic of ['body','main']) {
    const pending=deferred(),data=emptyData();data.journalEntries=[journal('j')];let returning=false;const env=create({readData:()=>({status:'available',data}),readMetadata:()=>returning?pending.promise:Promise.resolve([])});const body=env.helpers.node('body');body.root=true;env.main.root=false;body.append(env.main);env.doc.body=body;
    await env.ui.renderView();source(env.main,'j').click();const context={...env.opened[0].context,scrollPosition:99};env.ui.invalidate();env.main.replaceChildren();env.ui.returnTo(context);returning=true;const rendering=env.ui.renderView();(automatic==='body'?body:env.main).focus();pending.resolve([]);await rendering;
    assert.match(env.doc.activeElement.textContent,/Mở nguồn.*ID j/);assert.equal(env.doc.defaultView.scrollY,99);assert.equal((env.doc.listeners.focusin??[]).length,0);
  }
});
