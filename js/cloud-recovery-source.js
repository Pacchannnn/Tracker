import {createRecoveryCodec} from './cloud-recovery.js?v=44';
import {canonical} from './cloud-records.js?v=44';
import {validateFeedRecords} from './cloud-sync.js?v=44';
const same=(a,b)=>canonical(a)===canonical(b);
const identity=record=>JSON.stringify([record.kind,record.recordId]);
const sorted=records=>[...records].sort((a,b)=>identity(a).localeCompare(identity(b)));

// Completeness evidence is minted here after reading every page at captured H.
// Callers cannot replace this proof with an unchecked "complete" boolean.
export function createAccountRecovery({store,scope,call,download,isCurrent=()=>false}){
  const guard=()=>{if(!isCurrent())throw Error('workspace_sealed');};
  const proofs=new WeakMap();
  const codec=createRecoveryCodec({verifyCompleteSnapshot:evidence=>proofs.get(evidence)});
  async function exportFiles(){
    guard();let snapshot=await store.captureSnapshot(scope);guard();
    if(!snapshot.workspace.initialized||snapshot.workspace.bootstrap!==null)throw Error('incomplete_recovery_workspace');
    // Includes accepted tombstones, pending/conflict candidates and ledger references.
    const wanted=new Map();
    function visit(value){if(!value||typeof value!=='object'||value instanceof Blob)return;
      if(value.original?.assetId&&value.thumbnail?.assetId){for(const descriptor of [value.original,value.thumbnail])wanted.set(descriptor.assetId,descriptor);}
      for(const child of Object.values(value))visit(child);
    }
    visit(snapshot.workspace);visit(snapshot.jobs);visit(snapshot.ledgers);
    for(const descriptor of wanted.values())if(!snapshot.assets.some(asset=>asset.assetId===descriptor.assetId)){
      if(!download)throw Error('photo_bytes_missing');await download(descriptor);guard();
    }
    snapshot=await store.captureSnapshot(scope);guard();
    const {cursor:head,localRevision}=snapshot.workspace,all=[];let cursor=null,count=null;
    const seenCursors=new Set();
    do {
      const response=await call('bootstrap-v2',{headSequence:head,cursor,limit:100});guard();
      if(response?.headSequence!==head||!Number.isSafeInteger(response.snapshotRecordCount)||response.snapshotRecordCount<0
        || count!==null&&count!==response.snapshotRecordCount||typeof response.hasMore!=='boolean'
        || !Array.isArray(response.records)||response.records.length>100)throw Error('invalid_recovery_snapshot');
      count=response.snapshotRecordCount;validateFeedRecords(response.records,head);all.push(...response.records);
      if(all.length>count||response.hasMore&&all.length>=count||!response.hasMore&&all.length!==count)throw Error('incomplete_accepted_snapshot');
      if(response.hasMore){const last=response.records.at(-1);if(!last||!same(response.cursor,{kind:last.kind,recordId:last.recordId})||seenCursors.has(canonical(response.cursor)))throw Error('invalid_recovery_snapshot');seenCursors.add(canonical(response.cursor));cursor=response.cursor;}
      else {if(response.cursor!==null)throw Error('invalid_recovery_snapshot');cursor=null;}
    }while(cursor!==null);
    validateFeedRecords(all,head);
    if(!same(sorted(all),sorted(snapshot.workspace.shadow)))throw Error('incomplete_accepted_snapshot');
    const evidence={},counts={};for(const record of all)counts[record.kind]=(counts[record.kind]??0)+1;
    proofs.set(evidence,{verified:true,scope:structuredClone(scope),head,records:snapshot.workspace.shadow,counts});
    return codec.createRecoveryPackage(snapshot,{scope,completeSnapshot:evidence,recheckLocalRevision:async()=>{guard();const row=await store.read(scope);guard();if(row.localRevision!==localRevision)throw Error('recovery_workspace_changed');return row.localRevision;}});
  }
  return {
    export:exportFiles,
    async list(){guard();const result=await store.listDetachedRecoveries(scope);guard();return result;},
    async read(id){guard();const result=await store.readDetachedRecovery(scope,id);guard();if(!result)throw Error('recovery_not_found');return result;},
    async preview(files){guard();const parsed=await codec.parseRecoveryPackage(files,{scope});guard();return parsed;},
    async restore(files){guard();const parsed=await codec.parseRecoveryPackage(files,{scope});guard();const result=await store.saveDetachedRecovery(parsed.snapshot,crypto.randomUUID());guard();return result;}
  };
}
