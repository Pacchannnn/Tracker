import {createAuthContext} from './auth-context.js';
import {createMockProvider,createMockWorkspaces} from './mock-provider.js';

const adapter=createMockProvider(),operations=[];
const byId=id=>document.getElementById(id);
let transition=null,lastEpoch=0;
const context=createAuthContext({environment:'preview',projectId:'mock-project',deviceId:'mock-device',adapter,workspaces:createMockWorkspaces(),revokeURL:url=>URL.revokeObjectURL(url)});
const notice=text=>byId('notice').textContent=text;
function render(){
  const state=context.read(),active=state.status==='authenticated';
  if(state.epoch!==lastEpoch){byId('temporary').hidden=true;byId('temporary').removeAttribute('href');lastEpoch=state.epoch;}
  byId('state').textContent=`MOCK: ${state.status} · UID ${state.account?.uid||'NONE'} · epoch ${state.epoch} · pending ${state.pendingWork?'YES':'NO'} · verified NONE`;
  byId('requests').textContent=`Requests đang chờ: ${adapter.requests().map(x=>x.uid).join(', ')||'NONE'}`;
  byId('editor').hidden=!active;byId('sealed').textContent=active?'Chỉ workspace account hiện tại được mở.':'Workspace sealed; candidate account không được hiển thị.';
  if(active)byId('candidate').value=context.readWorkspace(context.capture()).text;
  byId('expire').disabled=!active;byId('refresh').disabled=!active;
  byId('logout').disabled=['local-only','signed-out'].includes(state.status);
  for(const id of ['resolve','wrong','reject'])byId(id).disabled=!adapter.requests().length;
  byId('warning').hidden=!transition;
  byId('operation-count').textContent=`Operations giả đang chờ: ${operations.length}`;byId('finish').disabled=!operations.length;
  if(!active){byId('candidate').value='';byId('temporary').hidden=true;byId('temporary').removeAttribute('href');}
}
context.subscribe(()=>{transition=null;render();});
async function action(run){
  try{const result=run();render();const outcome=await result;
    if(outcome?.warning){transition={run,confirmation:outcome.confirmation};notice('Pending work: xác nhận hoặc hủy chuyển context.');}
    else notice(outcome?.applied===false?'Response cũ hoặc identity sai đã bị chặn.':'Thao tác mock hoàn tất; không có upload.');
  }catch{notice('Thao tác mock bị từ chối; candidate giữ nguyên.');}render();
}
for(const uid of ['A','B'])byId(uid.toLowerCase()).onclick=()=>action(confirmation=>{
  const state=context.read();return state.account?context.switchAccount(uid,confirmation):context.login(uid);
});
byId('logout').onclick=()=>action(confirmation=>context.logout(confirmation));
byId('local').onclick=()=>action(confirmation=>context.localOnly(confirmation));
byId('confirm').onclick=()=>{const choice=transition;if(choice)action(()=>choice.run(choice.confirmation));};
byId('cancel').onclick=()=>{context.cancelWarning();transition=null;notice('Đã hủy; context không đổi.');render();};
byId('expire').onclick=()=>action(()=>context.expire(context.capture()));
byId('refresh').onclick=()=>action(()=>{const state=context.read();context.refresh(context.capture(),adapter.issue({environment:state.environment,projectId:state.projectId,uid:state.account.uid,assurance:'synthetic'}));});
byId('resolve').onclick=()=>{adapter.resolveNext();render();};
byId('wrong').onclick=()=>{adapter.resolveNext({uid:'WRONG'});render();};
byId('reject').onclick=()=>{adapter.rejectNext();render();};
// Capture editing into mock memory immediately so pending warnings include unsaved text.
byId('candidate').oninput=()=>{const field=byId('candidate'),position=field.selectionStart;context.writeWorkspace(context.capture(),{text:field.value,pending:true});field.setSelectionRange(position,position);};
byId('save').onclick=()=>action(()=>context.writeWorkspace(context.capture(),{text:byId('candidate').value,pending:true}));
byId('operation').onclick=()=>{
  const lease=context.capture(),candidate=context.readWorkspace(lease);
  action(()=>context.run(lease,()=>new Promise(resolve=>{operations.push(()=>resolve({text:candidate.text+' [mock result]',pending:false}));render();})));
};
byId('finish').onclick=()=>{operations.shift()?.();render();};
byId('url').onclick=()=>action(()=>{
  const url=URL.createObjectURL(new Blob(['SYNTHETIC TEXT ONLY'],{type:'text/plain'}));context.registerURL(context.capture(),url);
  const link=byId('temporary');link.href=url;link.download='mock.txt';link.hidden=false;
});
render();
