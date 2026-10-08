// Lifecycle boundary only. This phase deliberately accepts synthetic adapters only.
export function createAuthContext({environment,projectId,deviceId,adapter,workspaces,revokeURL=()=>{}}) {
  const validId = value => typeof value === 'string' && value.trim() && value.length <= 160;
  if (![environment,projectId,deviceId].every(validId) || adapter?.kind !== 'synthetic' || workspaces?.kind !== 'synthetic-memory') throw Error('Synthetic context required.');
  const base = Object.freeze({environment,projectId,deviceId});
  let status='local-only', account=null, epoch=0, revision=0, warning=null, signalController=new AbortController();
  const leases=new WeakSet(), listeners=new Set(), urls=new Set();
  const scope = uid => ({...base,uid});
  const state = () => ({...base,status,epoch,verifiedAccountId:null,account:account?{uid:account.uid,assurance:'synthetic'}:null,
    activeWorkspace:status==='authenticated'?{kind:'mock',...scope(account.uid)}:null,
    pendingWork:account?workspaces.read(scope(account.uid)).pending:false});
  function publish(){ revision++; warning=null; for(const listener of listeners){try{listener(state());}catch{/* Observers cannot break the lifecycle boundary. */}} }
  function invalidate(){
    epoch++; signalController.abort(); signalController=new AbortController();
    for(const url of urls){try{revokeURL(url);}catch{/* Access is sealed even if cleanup fails. */}} urls.clear();
  }
  function lease(uid){const value=Object.freeze({...base,uid,epoch,signal:signalController.signal});leases.add(value);return value;}
  const current = value => value && leases.has(value) && value.epoch===epoch && !value.signal.aborted;
  function requireAccess(value){if(!current(value)||status!=='authenticated'||value.uid!==account?.uid)throw Error('Workspace sealed or operation stale.');}
  function validIdentity(value,uid){return adapter.isIdentity(value) && value.assurance==='synthetic' && value.uid===uid && value.environment===environment && value.projectId===projectId;}
  function fail(){invalidate();status='error';publish();}
  function confirmIdentity(value,identity){
    if(!current(value)||!['authenticating','switching'].includes(status))throw Error('Login response stale.');
    if(!validIdentity(identity,value.uid)){fail();throw Error('Synthetic identity context rejected.');}
    account={uid:value.uid};status='authenticated';publish();return {applied:true};
  }
  function begin(uid,nextStatus){
    if(!validId(uid))throw Error('Choose a synthetic UID.');
    invalidate(); account=null;status=nextStatus;publish();const value=lease(uid);
    let response;
    try{response=adapter.beginLogin(base,uid,value);}catch{response=Promise.reject(Error('Provider start failed.'));}
    return Promise.resolve(response).then(identity=>{
      if(!current(value))return {applied:false};
      try{return confirmIdentity(value,identity);}catch{return {applied:false};}
    },()=>{if(current(value))fail();return {applied:false};});
  }
  function approve(kind,uid,confirmation){
    if(confirmation){
      if(confirmation!==warning || confirmation.epoch!==epoch || confirmation.revision!==revision || confirmation.kind!==kind || confirmation.uid!==uid)throw Error('Transition confirmation stale.');
      warning=null;return null;
    }
    if(account && workspaces.read(scope(account.uid)).pending){
      warning=Object.freeze({epoch,revision,kind,uid});return {warning:true,confirmation:warning};
    }
    return null;
  }
  const api={
    read:state,
    subscribe(listener){if(typeof listener!=='function')throw Error('Listener required.');listeners.add(listener);return()=>listeners.delete(listener);},
    login(uid){if(!['local-only','signed-out','error'].includes(status)||account)throw Error('Use explicit account switch or reauthentication.');return begin(uid,'authenticating');},
    confirmIdentity,
    capture(){if(status!=='authenticated')throw Error('No active account workspace.');return lease(account.uid);},
    readWorkspace(value){requireAccess(value);return workspaces.read(scope(value.uid));},
    writeWorkspace(value,candidate){
      requireAccess(value);
      if(!candidate || typeof candidate.text!=='string' || candidate.text.length>1000 || typeof candidate.pending!=='boolean')throw Error('Invalid synthetic candidate.');
      workspaces.write(scope(value.uid),{text:candidate.text,pending:candidate.pending});publish();
    },
    async run(value,task){
      requireAccess(value);
      api.writeWorkspace(value,{...api.readWorkspace(value),pending:true});
      const sourceRevision=revision;
      try{const result=await task(value.signal);if(!current(value)||status!=='authenticated'||value.uid!==account?.uid||sourceRevision!==revision)return {applied:false};api.writeWorkspace(value,result);return {applied:true};}
      catch{if(!current(value))return {applied:false};throw Error('Synthetic operation failed; candidate preserved.');}
    },
    refresh(value,identity){requireAccess(value);if(!validIdentity(identity,account.uid)){fail();throw Error('Refresh identity rejected.');}invalidate();publish();},
    expire(value){requireAccess(value);invalidate();status='expired';publish();},
    logout(confirmation){
      if(['local-only','signed-out'].includes(status))throw Error('No account transition to logout.');
      const gate=approve('logout',null,confirmation);if(gate)return gate;
      invalidate();account=null;status='signed-out';publish();return {applied:true};
    },
    switchAccount(uid,confirmation){
      if(!['authenticated','expired','error'].includes(status)||!account||!validId(uid)||(status==='authenticated'&&uid===account.uid))throw Error('Choose another account, or reauthenticate expired account.');
      const gate=approve('switch',uid,confirmation);if(gate)return gate;return begin(uid,'switching');
    },
    localOnly(confirmation){
      const gate=approve('local-only',null,confirmation);if(gate)return gate;
      invalidate();account=null;status='local-only';publish();return {applied:true};
    },
    cancelWarning(){warning=null;},
    registerURL(value,url){requireAccess(value);if(typeof url!=='string'||!url.startsWith('blob:'))throw Error('Temporary URL required.');urls.add(url);}
  };
  return Object.freeze(api);
}
