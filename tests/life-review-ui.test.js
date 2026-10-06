import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';

// A small semantic DOM adapter: these tests exercise rendered text, controls and
// source callbacks without adding a browser dependency to the runtime.
class Element {
  constructor(tag, doc) { this.tagName=tag; this.ownerDocument=doc; this.children=[]; this.attributes={}; this.listeners={}; this.style={}; this._text=''; this.parentNode=null; }
  get textContent() { return this._text+this.children.map(x=>x.textContent).join(' '); }
  set textContent(value) { this._text=String(value); this.children=[]; }
  get isConnected() { return this.root || !!this.parentNode?.isConnected; }
  append(...items) { for (const item of items) { item.remove?.(); item.parentNode=this; this.children.push(item); } }
  replaceChildren(...items) { this.children.forEach(x=>x.parentNode=null); this.children=[]; this._text=''; this.append(...items); }
  remove() { if(this.parentNode) this.parentNode.children=this.parentNode.children.filter(x=>x!==this); this.parentNode=null; }
  setAttribute(key,value) { this.attributes[key]=String(value); if(key==='name') this.name=String(value); }
  getAttribute(key) { return this.attributes[key]??null; }
  addEventListener(type,fn) { (this.listeners[type]??=[]).push(fn); }
  dispatch(type) { for(const fn of this.listeners[type]??[]) fn({target:this}); }
  click() { if(!this.disabled) this.dispatch('click'); }
  focus() { this.ownerDocument.activeElement=this; }
  scrollIntoView() {}
  querySelector(selector) { return all(this).find(el=>selector==='input'?el.tagName==='input':selector.startsWith('[name=')?el.name===selector.match(/"([^"]+)"/)[1]:false)??null; }
}
function all(root) { return root.children.flatMap(x=>[x,...all(x)]); }
function dom() {
  const doc={activeElement:null,defaultView:{scrollY:0,scrollTo({top}){this.scrollY=top;}}};
  const node=(tag,options={},children=[])=>{const el=new Element(tag,doc); for(const [key,value] of Object.entries(options)) { if(key==='text')el.textContent=value; else if(key==='onClick')el.addEventListener('click',value); else if(key==='value')el.value=value; else el.setAttribute(key,value); } el.append(...children); return el;};
  const helpers={node,button:(label,fn)=>node('button',{text:label,onClick:fn}),p:text=>node('p',{text}),h2:text=>node('h2',{text}),h3:text=>node('h3',{text}),div:(cls,...items)=>node('div',{class:cls},items),panel:(...items)=>node('section',{},items),fmt:String,field:(label,name,value,options)=>node('label',{},[node('span',{text:label}),node('input',{name,value,...options})])};
  const main=node('main'); main.root=true; return {main,helpers,doc};
}
const imported=await import('../js/life-review-ui.js').catch(()=>({}));
function create(options={}) { assert.equal(typeof imported.createLifeReviewUI,'function','Weekly Life Review UI interface must exist'); const env=dom(); const opened=[]; const ui=imported.createLifeReviewUI({...env,readData:()=>({status:'available',data:emptyData()}),readMetadata:async()=>[],today:()=> '2026-10-06',openSource:(ref,context)=>opened.push({ref,context}),openDay:(date,context)=>opened.push({date,context}),...options}); return {...env,opened,ui}; }
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const photo=(id,date)=>({id,date,category:'daily',pose:'',weight:null,waist:null,note:'',createdAt:'',updatedAt:''});
const journal=(id,date,mood='drained')=>({id,date,mood,title:'Recorded',note:'',tags:['Đi bộ']});
const button=(main,label)=>all(main).find(x=>x.tagName==='button'&&x.textContent.includes(label));

test('invalid selector retains valid week and announces inline error without reporting validity',async()=>{
  const {ui,main,doc}=create(); await ui.renderView(); const input=main.querySelector('[name="lifeReviewDate"]'); input.focus(); input.reportValidity=()=>assert.fail('must not steal focus'); input.value=''; input.dispatch('change'); await flush();
  assert.match(main.textContent,/2026-10-05.*2026-10-11/); assert.match(main.textContent,/Ngày.*không hợp lệ|Chọn ngày hợp lệ/); assert.equal(doc.activeElement,input); assert.equal(input.getAttribute('aria-invalid'),'true');
  input.value='9999-12-31'; input.dispatch('change'); await flush(); assert.match(main.textContent,/Khoảng ngày ngoài phạm vi hỗ trợ/); assert.equal(ui.getContext().weekAnchor,'2026-10-05');
});

test('old async photo response cannot overwrite newly selected week',async()=>{
  const pending=[]; const {ui,main}=create({readMetadata:()=>new Promise(resolve=>pending.push(resolve))}); const first=ui.renderView(); ui.select('2026-10-12'); pending[1]([photo('new-photo','2026-10-12')]); await flush(); pending[0]([photo('old-photo','2026-10-05')]); await first;
  assert.match(main.textContent,/2026-10-12.*2026-10-18/); assert.match(main.textContent,/new-photo/); assert.doesNotMatch(main.textContent,/old-photo/); assert.doesNotMatch(main.textContent,/0\/0/);
});

test('leave guards late metadata; return reads latest source and focuses metric after deletion',async()=>{
  let data=emptyData(); data.journalEntries=[journal('j','2026-10-05')]; let reads=0; const {ui,main,opened,doc}=create({readData:()=>{reads++;return {status:'available',data};}}); await ui.renderView();
  const source=all(main).find(x=>x.tagName==='button'&&x.textContent.includes('journal')&&x.textContent.includes('j')&&x.textContent.includes('2026-10-05')); assert.ok(source,'exact source button'); source.focus(); source.click(); assert.deepEqual(opened[0].ref,{kind:'journal',id:'j',date:'2026-10-05'}); assert.equal(opened[0].context.weekAnchor,'2026-10-05');
  ui.invalidate(); data={...data,journalEntries:[]}; ui.returnTo(opened[0].context); await ui.renderView(); assert.equal(reads,2); assert.match(main.textContent,/Chưa có dữ liệu được ghi/); assert.match(doc.activeElement.tagName,/^h[23]$/); assert.equal(doc.activeElement.textContent,'Nhật ký');
});

test('invalidated async request never appends after leaving',async()=>{
  let resolve; const {ui,main}=create({readMetadata:()=>new Promise(r=>resolve=r)}); const rendering=ui.renderView(); ui.invalidate(); main.replaceChildren(new Element('other',main.ownerDocument)); resolve([photo('late','2026-10-05')]); await rendering; assert.doesNotMatch(main.textContent,/late|Tuần đã ghi/);
});

test('canonical read failure preserves independent metadata and avoids false empty state',async()=>{
  const {ui,main}=create({readData:()=>{throw new Error('private raw exception');},readMetadata:async()=>[photo('p','2026-10-05')]}); await ui.renderView(); assert.match(main.textContent,/Chưa đọc được/); assert.match(main.textContent,/p/); assert.doesNotMatch(main.textContent,/private raw exception|Chưa có dữ liệu được ghi/);
  const failed=create({readMetadata:async()=>{throw new Error('private IDB exception');}}); await failed.ui.renderView(); assert.match(failed.main.textContent,/Chưa đọc được kho ảnh/); assert.doesNotMatch(failed.main.textContent,/Chưa có dữ liệu được ghi|private IDB exception/);
});

test('render eight coverage sources, exact moods, per macro denominator and future provenance',async()=>{
  const data=emptyData(); data.journalEntries=[journal('j','2026-10-05'),journal('future','2026-10-11','bright')]; data.entries=[{id:'n',date:'2026-10-05',meal:'Lunch',foodId:'deleted',servings:1,food:{name:'Food',serving:'1',calories:null,protein:0,carbs:0,fat:0}}];
  const {ui,main}=create({readData:()=>({status:'available',data})}); await ui.renderView(); const text=main.textContent; assert.match(text,/1\/2 ngày/); assert.match(text,/Mệt.*1\/1/); assert.match(text,/Trung bình Protein trên 1 ngày có số liệu rõ, trong 1 ngày có ghi/); assert.match(text,/Chưa rõ/); assert.match(text,/0 g/); assert.match(text,/Bản ghi có ngày sau hôm nay/); assert.match(text,/future/);
  for(const label of ['Nhật ký','Tâm trạng','Dinh dưỡng','Tập luyện','Cardio','Check-in','Gối','Ảnh']) assert.match(text,new RegExp(label));
});

test('refresh captures today once and all viewing leaves source snapshots untouched',async()=>{
  let calls=0,now='2026-10-06'; const data=emptyData(); Object.freeze(data); const before=JSON.stringify(data); const {ui,main}=create({readData:()=>({status:'available',data}),today:()=>{calls++;return now;}}); await ui.renderView(); assert.equal(calls,1); now='2026-10-07'; button(main,'Làm mới').click(); await flush(); assert.equal(calls,2); assert.match(main.textContent,/Tính đến 2026-10-07/); assert.equal(JSON.stringify(data),before);
});

test('current week control uses newly captured local today after midnight',async()=>{
  let now='2026-10-11',calls=0; const {ui,main}=create({today:()=>{calls++;return now;}}); await ui.renderView(); now='2026-10-12'; button(main,'Tuần hiện tại').click(); await flush(); assert.match(main.textContent,/2026-10-12.*2026-10-18/); assert.equal(calls,2);
});

test('return focuses exact source when it remains and period heading if metric vanished',async()=>{
  const data=emptyData(); data.journalEntries=[journal('same','2026-10-05')]; const {ui,main,doc,opened}=create({readData:()=>({status:'available',data})}); await ui.renderView();
  all(main).find(x=>x.tagName==='button'&&x.textContent.includes('ID same')).click(); ui.invalidate(); main.replaceChildren(); ui.returnTo(opened[0].context); await ui.renderView(); assert.match(doc.activeElement.textContent,/ID same/);
  ui.invalidate(); main.replaceChildren(); ui.returnTo({...opened[0].context,focusKey:'removed',metricKey:'removed',originatingMetric:'removed'}); await ui.renderView(); assert.equal(doc.activeElement.textContent,'Tuần đã ghi');
});

test('return restores the originating mood evidence row when the same journal contributes to several rows',async()=>{
  const data=emptyData(); data.journalEntries=[journal('shared','2026-10-05')]; const {ui,main,doc,opened}=create({readData:()=>({status:'available',data})}); await ui.renderView();
  const evidence=all(main).find(x=>x.tagName==='details'&&x.children[0].textContent==='Xem bản ghi · Ngày có tâm trạng rõ');
  all(evidence).find(x=>x.tagName==='button'&&x.textContent.includes('ID shared')).click();
  ui.invalidate(); main.replaceChildren(); ui.returnTo(opened[0].context); await ui.renderView();
  let parent=doc.activeElement.parentNode; while(parent&&parent.tagName!=='details')parent=parent.parentNode;
  assert.equal(parent.children[0].textContent,'Xem bản ghi · Ngày có tâm trạng rõ');
});

test('no-journal date navigation excludes existing journals with a blank mood',async()=>{
  const data=emptyData(); data.journalEntries=[journal('blank','2026-10-05','')]; const {ui,main}=create({readData:()=>({status:'available',data})}); await ui.renderView();
  const evidence=all(main).find(x=>x.tagName==='details'&&x.children[0].textContent==='Xem bản ghi · Ngày chưa có nhật ký');
  assert.deepEqual(all(evidence).filter(x=>x.tagName==='button').map(x=>x.textContent),['Xem ngày · 2026-10-06']);
  const missingMood=all(main).find(x=>x.tagName==='details'&&x.children[0].textContent==='Xem bản ghi · Nhật ký chưa ghi tâm trạng');
  assert.ok(all(missingMood).some(x=>x.tagName==='button'&&x.textContent.includes('ID blank')&&x.textContent.includes('2026-10-05')));
});

test('week navigation, date change and refresh restore the replacement control after async derivation',async()=>{
  const pending=[]; const {ui,main,doc}=create({readMetadata:()=>new Promise(resolve=>pending.push(resolve))});
  const initial=ui.renderView(); pending.shift()([]); await initial;
  for(const name of ['lifeReviewPrevious','lifeReviewDate','lifeReviewRefresh']) {
    const previous=main.querySelector(`[name="${name}"]`); previous.focus();
    if(name==='lifeReviewDate') { previous.value='2026-10-12'; previous.dispatch('change'); } else previous.click();
    const replacement=main.querySelector(`[name="${name}"]`); assert.notEqual(replacement,previous);
    pending.shift()([]); await flush(); assert.equal(doc.activeElement.isConnected,true,`${name} should focus the connected replacement`); assert.equal(doc.activeElement.getAttribute('name'),name);
  }
});

test('metadata status completion does not move existing focus during an ordinary render',async()=>{
  let resolve; const {ui,main,doc}=create({readMetadata:()=>new Promise(r=>resolve=r)}); const rendering=ui.renderView();
  const input=main.querySelector('[name="lifeReviewDate"]'); input.focus(); resolve([]); await rendering; assert.equal(doc.activeElement,input);
});

test('late navigation metadata preserves focus moved by the user to another connected control',async()=>{
  const pending=[]; const {ui,main,doc}=create({readMetadata:()=>new Promise(resolve=>pending.push(resolve))});
  const initial=ui.renderView(); pending.shift()([]); await initial;
  const previous=main.querySelector('[name="lifeReviewPrevious"]'); previous.focus(); previous.click();
  const next=main.querySelector('[name="lifeReviewNext"]'); next.focus();
  pending.shift()([]); await flush(); assert.equal(doc.activeElement.getAttribute('name'),'lifeReviewNext'); assert.equal(doc.activeElement.isConnected,true);
});
