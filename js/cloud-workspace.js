import { createAccountStore, scopeKey } from './cloud-store.js?v=41';
import { createSyncEngine, projectAccountWorkspace } from './cloud-sync.js?v=41';

// Workspace access is device-local; only Auth/gateway authorize remote writes.
export function createCloudWorkspace({ auth, indexedDB = globalThis.indexedDB, dbName = 'tracker-sync', storeFactory = createAccountStore, engineFactory = createSyncEngine, transportFactory, hasUnsaved = () => false } = {}) {
  let mode='local', epoch=0, store=null, engine=null, current=null, lease=null, cached=false, warning=null, syncStatus='local-only', refreshing=false;
  const listeners=new Set();
  const publish=()=>{for(const fn of listeners){try{fn(api.read());}catch{}}};
  function invalidate() { ++epoch; engine?.pause('sealed');store?.seal();engine=null;store=null;lease=null;current=null;warning=null;refreshing=false; }
  const pendingKey=()=>JSON.stringify({epoch,revision:current?.localRevision,queue:current?.outbox.map(op=>op.id),dirty:hasUnsaved()});
  function approve(action, confirmation) {
    if(confirmation!==undefined){const valid=warning&&warning.action===action&&warning.ticket===confirmation&&warning.key===pendingKey();warning=null;return valid?null:{applied:false};}
    warning=null;if(!hasUnsaved()&&!current?.outbox.length&&!current?.conflicts.some(c=>c.status==='unresolved'))return null;
    const ticket=Object.freeze({});warning={ticket,action,key:pendingKey()};return {warning:true,confirmation:ticket};
  }
  async function activate(scope, isCached=false) {
    const capturedLease=isCached?null:auth.capture();
    const verified=auth.read().account;
    if(!isCached&&(!verified||scopeKey(scope)!==scopeKey({uid:verified.uid,environment:verified.environment,projectId:verified.projectId})))throw Error('account_not_verified');
    invalidate(); mode='opening';cached=isCached;syncStatus=isCached?'needs-login':'pending';const captured=epoch;lease=capturedLease;publish();
    const active=()=>epoch===captured&&(cached||auth.isCurrent(lease));
    const owned=storeFactory({indexedDB,dbName,isCurrent:active});store=owned;
    try {
      const row=isCached?await owned.read(scope):await owned.open(scope);
      if(!active())throw Error('stale_workspace');current=row;mode='account';
      if(!isCached){engine=engineFactory({store:owned,scope:row.scope,isCurrent:()=>active()&&!cached,transport:transportFactory?transportFactory(capturedLease,row.scope):{call:(route,body,options)=>auth.gatewayCall(lease,route,body,options)},onChange:state=>{if(active()){syncStatus=state.status??state.state;void api.refresh().catch(()=>{});}}});}
      const ownedEngine=engine,status=isCached?null:await ownedEngine.status();if(!active()||owned!==store||!isCached&&ownedEngine!==engine)throw Error('stale_workspace');syncStatus=isCached?'needs-login':status.status??status.state;publish();return {applied:true};
    } catch(error){if(epoch===captured){engine?.pause('failed');engine=null;owned.seal();store=null;current=null;mode='sealed';syncStatus='failed';publish();}throw error;}
  }
  const api={
    read(){return {mode,epoch,cached,uid:current?.scope.uid??null,environment:current?.scope.environment??null,projectId:current?.scope.projectId??null,syncStatus:cached?'needs-login':syncStatus,outboxCount:current?.outbox.length??(mode==='local'?0:null),conflicts:structuredClone(current?.conflicts.filter(c=>c.status==='unresolved')??[])};},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    getData(){if(mode!=='account'||!current)throw Error('workspace_sealed');return structuredClone(current.data);},
    async openAccount(confirmation){const gate=approve('account',confirmation);if(gate)return gate;const a=auth.read().account;if(!a)throw Error('account_not_verified');return activate({uid:a.uid,environment:a.environment,projectId:a.projectId});},
    async cachedScopes(){const probe=storeFactory({indexedDB,dbName,isCurrent:()=>true});try{return await probe.listScopes();}finally{probe.seal();}},
    async openCached(scope,confirmation){const captured=epoch,scopes=await api.cachedScopes();if(captured!==epoch)throw Error('stale_workspace');if(!scopes.some(s=>scopeKey(s)===scopeKey(scope)))throw Error('unknown_cached_account');const action='cache:'+scopeKey(scope),gate=approve(action,confirmation);if(gate)return gate;return activate(scope,true);},
    async localOnly(confirmation){const gate=approve('local',confirmation);if(gate)return gate;invalidate();mode='local';cached=false;syncStatus='local-only';publish();return {applied:true};},
    async reviewLatest(confirmation){const gate=approve('refresh',confirmation);if(gate)return gate;return {applied:true,data:await api.refresh()};},
    async write(change,expectedData=current?.data){if(mode!=='account'||!store)throw Error('workspace_sealed');const owned=store,captured=epoch;const row=await owned.commit(current.scope,change,expectedData);if(captured!==epoch||owned!==store)throw Error('stale_workspace');current=row;syncStatus=cached?'needs-login':row.conflicts.some(c=>c.status==='unresolved')?'conflict':row.outbox.length?'pending':row.initialized?'synced':'pending';publish();return structuredClone(row.data);},
    async refresh(notify=true){if(mode!=='account'||!store)throw Error('workspace_sealed');const captured=epoch,owned=store,row=await owned.read(current.scope);if(captured!==epoch||owned!==store)throw Error('stale_workspace');const state=cached?null:await engine.status();if(captured!==epoch)throw Error('stale_workspace');current=row;syncStatus=cached?'needs-login':state.status??state.state;if(notify)publish();return structuredClone(row.data);},
    async sync(){if(mode!=='account'||cached||!engine)throw Error('needs_login');const owned=engine,captured=epoch;syncStatus='syncing';publish();try{const result=await owned.sync();if(captured!==epoch||owned!==engine)throw Error('stale_workspace');await api.refresh();if(captured!==epoch||owned!==engine)throw Error('stale_workspace');return result;}catch(error){if(captured===epoch){syncStatus='failed';publish();}throw error;}},
    pause(){engine?.pause('paused');syncStatus='paused';publish();},
    resume(){if(cached||!engine)throw Error('needs_login');engine.resume();syncStatus='pending';publish();return api.sync();},
    async getConflict(id){if(!engine)throw Error('needs_login');const owned=engine,captured=epoch,result=await owned.readConflict(id);if(captured!==epoch||owned!==engine)throw Error('stale_workspace');await api.refresh();if(captured!==epoch||owned!==engine)throw Error('stale_workspace');return result;},
    async resolveConflict(id,choice,token){if(!engine)throw Error('needs_login');const owned=engine,captured=epoch,result=await owned.resolveConflict(id,choice,token);if(captured!==epoch||owned!==engine)throw Error('stale_workspace');await api.refresh();if(captured!==epoch||owned!==engine)throw Error('stale_workspace');return result;},
    async selectLive(recordId){if(mode!=='account'||!current)throw Error('workspace_sealed');const owned=store,captured=epoch;const row=await owned.transact(current.scope,current.localRevision,w=>{if(captured!==epoch||owned!==store)throw Error('stale_workspace');const r=w.shadow.find(item=>item.kind==='workout'&&item.recordId===recordId&&!item.deleted&&item.phase==='live');if(!r||w.data.draft)throw Error('live_workout_unavailable');w.selectedLiveId=recordId;projectAccountWorkspace(w);});if(captured!==epoch||owned!==store)throw Error('stale_workspace');current=row;publish();return structuredClone(row.data);},
    availableLive(){return structuredClone(current?.shadow.filter(r=>r.kind==='workout'&&!r.deleted&&r.phase==='live')??[]);},
    seal(){invalidate();mode='sealed';cached=false;syncStatus='needs-login';publish();},
    cancelWarning(){warning=null;}
  };
  auth.subscribe(state=>{
    if(mode!=='account'&&mode!=='opening')return;
    if(mode==='opening'&&!cached&&(!lease||!auth.isCurrent(lease))){api.seal();return;}
    if(state.step==='refreshing'&&!cached){engine?.pause('auth');cached=true;refreshing=true;syncStatus='needs-login';publish();return;}
    if(refreshing){if(current&&state.account&&scopeKey(current.scope)===scopeKey({uid:state.account.uid,environment:state.account.environment,projectId:state.account.projectId})){lease=auth.capture();cached=false;refreshing=false;engine?.resume();publish();}else if(['expired','error','signed-out','local-only','switching'].includes(state.status)){refreshing=false;api.seal();}return;}
    if(cached){if(['expired','error','signed-out','local-only','switching'].includes(state.status))api.seal();return;}
    if(!lease||!auth.isCurrent(lease)){api.seal();}
  });
  return Object.freeze(api);
}
