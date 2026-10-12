import { prepareImportLedger, planImportLedger, parseImportLedger, serializeImportLedger, recordImportReceipt } from './cloud-import-ledger.js';
import { projectionFromRecords, recordsFromData, canonical, recordKey } from './cloud-records.js';
import { scopeKey } from './cloud-store.js';

function photoReferences(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => key === 'photoId' && child != null || key === 'photoIds' && Array.isArray(child) && child.length || photoReferences(child));
}
export function createAccountImporter({store,scope,isCurrent=()=>true}) {
  scopeKey(scope);
  const guard=()=>{if(!isCurrent())throw Error('workspace_changed');};
  async function read(id) {
    guard(); const row=await store.read(scope), ledger=await store.readImportLedger(scope,id); guard();
    if(!ledger)throw Error('import_ledger_missing');
    const verified=await parseImportLedger(serializeImportLedger(ledger),{scope,deviceId:row.deviceId}); guard(); return verified;
  }
  return {
    read,
    async list(){guard(); const snapshot=await store.captureSnapshot(scope); guard(); return structuredClone(snapshot.ledgers);},
    async prepare(sourceText,photoText=null){
      guard(); const row=await store.read(scope);
      const ledger=await prepareImportLedger({sourceText,photoText,accountData:row.data,photoMetadata:photoText===null?[]:undefined,scope,deviceId:row.deviceId});
      guard(); await store.writeImportLedger(scope,ledger,row.localRevision); return ledger;
    },
    async plan(id,decisions,consent){
      const ledger=await read(id), row=await store.read(scope);
      const planned=await planImportLedger(ledger,{decisions,consent,domainValidate(candidate){
        if(JSON.parse(ledger.source.text).schemaVersion!==8)throw Error('unsupported_import_schema_keep_local');
        if(photoReferences(candidate.payload))throw Error('import_photo_keep_local_required');
        const record={...candidate,payloadSchema:8,position:'0',...(candidate.kind==='workout'?{phase:'completed'}:{})};
        const data=projectionFromRecords([record],row.deviceId);
        const restored=recordsFromData(data,row.deviceId).find(r=>recordKey(r)===recordKey(record));
        if(!restored || canonical(restored.payload)!==canonical(candidate.payload))throw Error('import_normalization_forbidden');
        return true;
      }});
      guard(); await store.writeImportLedger(scope,planned,row.localRevision); return planned;
    },
    async queue(id){return this.resume(id);},
    async resume(id){
      let ledger=await read(id); if(ledger.state==='review')throw Error('import_review_required');
      const snapshot=await store.captureSnapshot(scope);
      for(const batch of ledger.batches){
        const receipt=snapshot.workspace.receipts?.find(r=>r.operationId===batch.operationId);
        if(receipt){if(canonical(receipt.request)!==canonical(batch.request))throw Error('import_receipt_mismatch'); ledger=recordImportReceipt(ledger,batch.operationId,{...receipt,status:'applied'});}
        else {
          // Older ledgers remain inspectable, but malformed legacy wire requests
          // cannot be sent or silently rewritten with a different fingerprint.
          const change=batch.request.changes[0];
          if(JSON.parse(ledger.source.text).schemaVersion!==8)throw Error('unsupported_import_schema_keep_local');
          const projected=projectionFromRecords([{...change,position:'0'}],snapshot.workspace.deviceId);
          const restored=recordsFromData(projected,snapshot.workspace.deviceId).find(r=>recordKey(r)===recordKey(change));
          if(!restored || canonical(restored.payload)!==canonical(change.payload))throw Error('import_normalization_forbidden');
        }
      }
      guard(); await store.queueImportLedger(scope,ledger,snapshot.workspace.localRevision); return ledger;
    }
  };
}
