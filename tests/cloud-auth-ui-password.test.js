import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudAuth,createSupabaseAuthAdapter} from '../js/cloud-auth.js';
import {createCloudAuthUI} from '../js/cloud-auth-ui.js';

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.value='';this.parent=null;this._text='';}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ');}set textContent(value){this._text=value;this.children=[];}
  get isConnected(){return this.root||Boolean(this.parent?.isConnected);}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children.forEach(x=>x.parent=null);this.children=[];this._text='';this.append(...items);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  async dispatch(type){
    if(this.disabled)return;let prevented=false;
    await Promise.all((this.listeners[type]??[]).map(fn=>fn({preventDefault(){prevented=true;},target:this})));
    if(type==='click'&&!prevented&&this.tagName==='button'&&this.getAttribute('type')==='submit'){
      const form=formOf(this);if(form&&!all(form).some(x=>x.tagName==='input'&&x.getAttribute('required')!==null&&!x.value))await form.dispatch('submit');
    }
    await new Promise(r=>setImmediate(r));
  }
  querySelector(selector){return all(this).find(x=>selector==='input'&&x.tagName==='input');}
}
const all=root=>root.children.flatMap(x=>[x,...all(x)]);
const formOf=element=>{for(let item=element.parent;item;item=item.parent)if(item.tagName==='form')return item;return null;};
async function pressEnter(element){
  const form=formOf(element);if(!form)return;
  const submit=all(form).find(x=>x.tagName==='button'&&x.getAttribute('type')==='submit');
  if(submit)await submit.dispatch('click');
  else if(all(form).filter(x=>x.tagName==='input'&&['email','password','text'].includes(x.getAttribute('type'))).length<=1)await form.dispatch('submit');
}
const input=(s,name)=>all(s.host).find(x=>x.tagName==='input'&&x.getAttribute('name')===name);
const button=(s,label)=>all(s.host).find(x=>x.tagName==='button'&&x.textContent.includes(label));
const email='synthetic@example.invalid',password='never-retain-this-password';
const A='11111111-1111-4111-8111-111111111111';
const session=()=>({access_token:'access',refresh_token:'refresh',token_type:'bearer',expires_in:120});
const user=()=>({id:A,email,email_confirmed_at:'2026-01-01',role:'authenticated',aud:'authenticated'});
function setup({environment='preview',enabled=true,getPendingWork=()=>null}={}){
  const calls=[],replies=[];
  const auth=createCloudAuth({adapter:createSupabaseAuthAdapter({config:{enabled,environment,projectUrl:'https://fixtureproject.supabase.co',publishableKey:'sb_publishable_fixture'},now:()=>1000000,fetchImpl:async(url,init)=>{
    calls.push({url,init});let reply=replies.shift();if(typeof reply==='function')reply=await reply();if(!reply)throw Error('No fixture response');
    return {ok:(reply.status??200)<400,status:reply.status??200,json:async()=>reply.body??reply};
  }}),now:()=>1000000,setTimer:()=>0,clearTimer:()=>{},getPendingWork});
  const node=(tag,options={},children=[])=>{const el=new Element(tag);for(const [key,value]of Object.entries(options)){if(key==='text')el.textContent=value;else if(key==='value')el.value=value;else if(key==='onClick')el.addEventListener('click',value);else el.setAttribute(key,value);}el.append(...children);return el;};
  const helpers={node,button:(text,fn)=>node('button',{text,onClick:fn,type:'button'}),p:(text,cls)=>node('p',{text,class:cls}),h2:text=>node('h2',{text}),div:(cls,...items)=>node('div',{class:cls},items),panel:()=>node('section'),field:(label,name,value,options)=>node('label',{},[node('span',{text:label}),node('input',{name,value,...options})])};
  const ui=createCloudAuthUI({auth,helpers});const host=ui.mount();host.root=true;
  return {ui,host,auth,calls,replies};
}
async function fill(s){input(s,'cloudEmail').value=email;await input(s,'cloudEmail').dispatch('input');input(s,'cloudPassword').value=password;await input(s,'cloudPassword').dispatch('input');return input(s,'cloudPassword');}
async function passwordMode(s){const toggle=button(s,'Đăng nhập bằng mật khẩu');assert.ok(toggle,'enabled preview must offer password mode');await toggle.dispatch('click');}

test('preview offers explicit password mode and production/local-only expose only existing behavior',async()=>{
  const s=setup();assert.equal(input(s,'cloudPassword'),undefined);await passwordMode(s);
  assert.equal(input(s,'cloudPassword').getAttribute('type'),'password');assert.equal(input(s,'cloudPassword').getAttribute('autocomplete'),'current-password');
  assert.match(s.host.textContent,/Preview/);assert.ok(button(s,'Dùng mã OTP'));
  for(const options of [{environment:'production'},{enabled:false}]){const other=setup(options);assert.equal(button(other,'Đăng nhập bằng mật khẩu'),undefined);assert.equal(input(other,'cloudPassword'),undefined);}
});

test('password clears immediately on submit and stays absent after successful or failed login',async()=>{
  for(const success of [true,false]){
    const s=setup();await passwordMode(s);const field=await fill(s);
    s.replies.push(...(success?[session(),user()]:[{status:401,body:{message:password}}]));
    await button(s,'Xác nhận mật khẩu').dispatch('click');assert.equal(field.value,'');
    assert.equal(s.auth.read().status,success?'authenticated':'error');assert.ok(!s.host.textContent.includes(password));
    if(success)assert.equal(input(s,'cloudPassword'),undefined);else assert.equal(input(s,'cloudPassword').value,'');
    if(success){await button(s,'Đổi tài khoản').dispatch('click');assert.equal(input(s,'cloudPassword').value,'');}
  }
});

test('pending password warning clears original password and requires re-entry before confirmation',async()=>{
  const s=setup({getPendingWork:()=> 'unsaved'});await passwordMode(s);const field=await fill(s);
  await button(s,'Xác nhận mật khẩu').dispatch('click');assert.equal(field.value,'');assert.equal(s.calls.length,0);assert.match(s.host.textContent,/chưa lưu|đang soạn/);
  await button(s,'Tiếp tục').dispatch('click');assert.equal(s.calls.length,0);assert.equal(input(s,'cloudPassword').value,'');
  assert.match(s.host.textContent,/Nhập.*mật khẩu/i);
  input(s,'cloudPassword').value=password;s.replies.push(session(),user());await button(s,'Tiếp tục').dispatch('click');
  assert.equal(s.auth.read().status,'authenticated');assert.equal(s.calls.length,2);
});

test('cancel pending warning, logout, local-only and mode change erase detached password fields',async()=>{
  for(const action of ['Dùng mã OTP','Tiếp tục cục bộ']){
    const s=setup();await passwordMode(s);const field=await fill(s);await button(s,action).dispatch('click');assert.equal(field.value,'');
  }
  const s=setup({getPendingWork:()=> 'draft'});await passwordMode(s);await fill(s);await button(s,'Xác nhận mật khẩu').dispatch('click');
  const warningField=input(s,'cloudPassword');warningField.value=password;await button(s,'Hủy chuyển').dispatch('click');assert.equal(warningField.value,'');assert.equal(input(s,'cloudPassword').value,'');
  const other=setup();await passwordMode(other);await fill(other);other.replies.push({status:401});await button(other,'Xác nhận mật khẩu').dispatch('click');
  const failedField=await fill(other);await button(other,'Đăng xuất').dispatch('click');assert.equal(failedField.value,'');assert.equal(other.auth.read().status,'signed-out');
});

test('changing mode cancels an in-flight password callback before OTP can open',async()=>{
  const s=setup();await passwordMode(s);await fill(s);let resolve;const response=new Promise(r=>resolve=r);s.replies.push(()=>response,user());
  const pending=button(s,'Xác nhận mật khẩu').dispatch('click');
  await new Promise(r=>setImmediate(r));
  assert.equal(s.auth.read().step,'verifying');await button(s,'Dùng mã OTP').dispatch('click');assert.equal(s.auth.read().status,'signed-out');
  resolve(session());await pending;assert.equal(s.auth.read().verifiedAccountId,null);assert.equal(input(s,'cloudPassword'),undefined);assert.ok(button(s,'Gửi mã OTP'));
});

test('logout publication clears password even after navigation detached its host',async()=>{
  const s=setup();await passwordMode(s);const field=await fill(s);s.host.root=false;
  assert.equal(s.host.isConnected,false);await s.auth.logout();assert.equal(field.value,'');
});

test('navigation cleanup clears only password without an auth publication or transport request',async()=>{
  const s=setup();await passwordMode(s);const field=await fill(s);const before=s.auth.read();let publications=0;s.auth.subscribe(()=>publications++);
  s.host.root=false;assert.equal(s.host.isConnected,false);
  assert.equal(typeof s.ui.clearSensitiveInput,'function');s.ui.clearSensitiveInput();
  assert.equal(field.value,'');assert.equal(input(s,'cloudEmail').value,email);assert.equal(publications,0);assert.deepEqual(s.auth.read(),before);assert.equal(s.calls.length,0);
});

test('native implicit submission from password field sends exactly one login request',async()=>{
  const s=setup();await passwordMode(s);const field=await fill(s);s.replies.push(session(),user());
  await pressEnter(field);assert.equal(s.auth.read().status,'authenticated');assert.equal(s.calls.length,2);
  assert.equal(s.calls.filter(x=>x.url.endsWith('grant_type=password')).length,1);assert.equal(field.value,'');
});

test('pending confirmation uses a form so Enter in re-entered password confirms exactly once',async()=>{
  const s=setup({getPendingWork:()=> 'draft'});await passwordMode(s);await fill(s);await button(s,'Xác nhận mật khẩu').dispatch('click');
  const field=input(s,'cloudPassword');field.value=password;s.replies.push(session(),user());await pressEnter(field);
  assert.equal(s.auth.read().status,'authenticated');assert.equal(s.calls.length,2);assert.equal(field.value,'');
});
