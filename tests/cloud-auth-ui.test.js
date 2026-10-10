import test from 'node:test';
import assert from 'node:assert/strict';
const imported=await import('../js/cloud-auth-ui.js').catch(()=>({}));
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.value='';this.parent=null;this._text='';}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ');} set textContent(value){this._text=value;this.children=[];}
  get isConnected(){return this.root||Boolean(this.parent?.isConnected);}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children.forEach(x=>x.parent=null);this.children=[];this._text='';this.append(...items);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);} dispatch(type){return Promise.all((this.listeners[type]??[]).map(fn=>fn({preventDefault(){},target:this})));}
  querySelector(selector){return all(this).find(x=>selector==='input'?x.tagName==='input':false);}
}
const all=root=>root.children.flatMap(x=>[x,...all(x)]);
function setup(state={status:'signed-out',enabled:true,step:null}, options={}){
  const node=(tag,options={},children=[])=>{const el=new Element(tag);for(const[key,value]of Object.entries(options)){if(key==='text')el.textContent=value;else if(key==='value')el.value=value;else if(key==='onClick')el.addEventListener('click',value);else el.setAttribute(key,value);}el.append(...children);return el;};
  const helpers={node,button:(text,fn)=>node('button',{text,onClick:fn}),p:(text,cls)=>node('p',{text,class:cls}),h2:text=>node('h2',{text}),div:(cls,...items)=>node('div',{class:cls},items),panel:(...items)=>node('section',{},items),field:(label,name,value,options)=>node('label',{},[node('span',{text:label}),node('input',{name,value,...options})])};
  const calls=[],listeners=[];let response={applied:true};
  const auth={read:()=>structuredClone(state),subscribe:fn=>{listeners.push(fn);return()=>{};},cancelWarning:()=>calls.push(['cancel']),...Object.fromEntries(['sendOtp','verifyOtp','logout','localOnly','switchAccount'].map(action=>[action,async(...args)=>{calls.push([action,...args]);return response;}]))};
  assert.equal(typeof imported.createCloudAuthUI,'function','Settings auth UI must exist');
  const ui=imported.createCloudAuthUI({auth,helpers,...options});const main=node('main');main.root=true;main.append(node('input',{name:'calories',value:'1777'}));main.append(ui.mount());
  return {main,ui,calls,setResponse:value=>response=value,emit:patch=>{Object.assign(state,patch);listeners.forEach(fn=>fn(auth.read()));}};
}
const find=(main,tag,label)=>all(main).find(el=>el.tagName===tag&&el.textContent.includes(label));
const input=(main,name)=>all(main).find(el=>el.tagName==='input'&&el.getAttribute('name')===name);
test('disabled local-only panel explains no synchronization and exposes no secret/config input',()=>{
  const s=setup({status:'local-only',enabled:false});assert.match(s.main.textContent,/Chỉ trên thiết bị|Cục bộ/);assert.match(s.main.textContent,/chưa.*đồng bộ|Chưa.*đồng bộ/);
  assert.equal(all(s.main).filter(el=>el.tagName==='input').length,1);assert.match(s.main.textContent,/chưa được cấu hình/);
});
test('Settings auth updates preserve unrelated settings and in-memory OTP input',async()=>{
  const s=setup();input(s.main,'cloudEmail').value='fixture@example.invalid';await input(s.main,'cloudEmail').dispatch('input');
  await find(s.main,'button','Gửi mã').dispatch('click');assert.deepEqual(s.calls[0],['sendOtp','fixture@example.invalid',undefined]);
  s.emit({status:'authenticating',step:'awaiting-code'});input(s.main,'cloudOtp').value='123456';await input(s.main,'cloudOtp').dispatch('input');
  s.emit({notice:'Thử lại'});assert.equal(input(s.main,'calories').value,'1777');assert.equal(input(s.main,'cloudOtp').value,'123456');
  await find(s.main,'button','Xác nhận mã').dispatch('click');assert.deepEqual(s.calls.at(-1),['verifyOtp','123456',undefined]);
});
test('signed-in panel labels anonymous workspace and disabled account editing',()=>{
  const s=setup({status:'authenticated',enabled:true,verifiedAccountId:'fixture-uid'});assert.match(s.main.textContent,/Đã đăng nhập/);assert.match(s.main.textContent,/ẩn danh.*cục bộ/);assert.match(s.main.textContent,/chưa.*tải lên|Chưa.*tải lên/);
  assert.equal(find(s.main,'button','dữ liệu tài khoản').disabled,true);assert.ok(!s.main.textContent.includes('Synced'));assert.equal(input(s.main,'cloudEmail'),undefined);
});
test('workspace-enabled Auth panel describes login separately from active data or sync state',()=>{
  const s=setup({status:'authenticated',enabled:true},{workspaceAvailable:true});
  assert.ok(!s.main.textContent.includes('Tracker tiếp tục dùng không gian ẩn danh'));
  assert.ok(!s.main.textContent.includes('Dữ liệu chưa được đồng bộ hoặc tải lên'));
  assert.match(s.main.textContent,/trạng thái đồng bộ.*Không gian dữ liệu/i);
  assert.match(s.main.textContent,/không tự.*chuyển|không chuyển.*dữ liệu/i);
  assert.equal(find(s.main,'button','dữ liệu tài khoản'),undefined);
});
test('pending warning offers cancel and opaque confirmation before transition',async()=>{
  const s=setup(),confirmation={};s.setResponse({warning:true,confirmation});input(s.main,'cloudEmail').value='fixture@example.invalid';await input(s.main,'cloudEmail').dispatch('input');
  await find(s.main,'button','Gửi mã').dispatch('click');assert.match(s.main.textContent,/chưa lưu|đang soạn/);await find(s.main,'button','Hủy chuyển').dispatch('click');assert.deepEqual(s.calls.at(-1),['cancel']);
  await find(s.main,'button','Gửi mã').dispatch('click');s.setResponse({applied:true});await find(s.main,'button','Tiếp tục').dispatch('click');assert.equal(s.calls.at(-1)[2],confirmation);
});
test('account-switch form closes after a verified new session',async()=>{
  const s=setup({status:'authenticated',enabled:true});await find(s.main,'button','Đổi tài khoản').dispatch('click');assert.ok(input(s.main,'cloudEmail'));
  s.emit({status:'switching',step:'awaiting-code'});s.emit({status:'authenticated',step:null});
  assert.equal(input(s.main,'cloudEmail'),undefined);assert.ok(find(s.main,'button','Đổi tài khoản'));
});
test('each lifecycle state is announced and stale unmounted panel is not rewritten',()=>{
  const s=setup();for(const [status,label]of [['signed-out','Chưa đăng nhập'],['authenticating','Đang đăng nhập'],['expired','hết hạn'],['error','Lỗi xác thực']]){s.emit({status});assert.ok(s.main.textContent.includes(label));}
  const old=s.main.children.at(-1);s.main.replaceChildren();s.emit({status:'authenticated'});assert.ok(!old.textContent.includes('Đã đăng nhập'));
});
