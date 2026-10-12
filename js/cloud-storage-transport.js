const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeError=()=>new Error('Không đọc hoặc tải được ảnh riêng tư. Dữ liệu đã lưu vẫn được giữ.');
export async function callPrivateStorage({identity,credential,projectId,environment,origin,publicKey,fetchImpl,now,request,signal}) {
  const {method,path,blob}=request;
      const parts=typeof path==='string'?path.split('/'):[];
      if(!credential||identity.expiresAt<=now()||signal?.aborted||!['GET','POST'].includes(method)||parts.length!==5||parts[0]!==projectId||parts[1]!==environment||parts[2]!==identity.uid||!UUID.test(parts[3])||!['original.jpg','thumbnail.jpg'].includes(parts[4])||method==='POST'&&(!(blob instanceof Blob)||blob.type!=='image/jpeg'||!blob.size||blob.size>20_000_000))throw safeError();
      const deadline=new AbortController(),abort=()=>deadline.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,15000);
      try {
        const response=await fetchImpl(origin+'/storage/v1/object/'+(method==='GET'?'authenticated/':'')+'tracker-preview-photos/'+path,{method,headers:{apikey:publicKey,Authorization:`Bearer ${credential.accessToken}`,...(method==='POST'?{'Content-Type':'image/jpeg','x-upsert':'false'}:{})},...(method==='POST'?{body:blob}:{}),signal:deadline.signal,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'});
        if(deadline.signal.aborted)throw safeError();
        if(method==='POST'&&(response.status===409||response.status===400)){
          const value=await response.json().catch(()=>null);if(response.status===409||value?.statusCode==='409'||value?.error==='Duplicate')return{status:'exists'};
        }
        if(!response.ok)throw safeError();
        if(method==='POST')return{status:'uploaded'};
        if(!/^image\/jpeg(?:;|$)/i.test(response.headers.get('Content-Type')||'')||Number(response.headers.get('Content-Length')||0)>20_000_000)throw safeError();
        const reader=response.body.getReader(),chunks=[];let bytes=0;
        try {while(true){const value=await reader.read();if(value.done)break;bytes+=value.value.byteLength;if(bytes>20_000_000||deadline.signal.aborted)throw safeError();chunks.push(value.value);}}
        finally {await reader.cancel().catch(()=>{});}
        if(deadline.signal.aborted||!bytes)throw safeError();return new Blob(chunks,{type:'image/jpeg'});
      }catch{throw safeError();}
      finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
    }
