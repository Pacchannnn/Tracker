// User-selected files only. Full restore creates an offline detached copy.
export function createRecoveryUI({workspace,helpers,registerUrl}){
  const {node,button,panel,div,p,h2,field,confirmAction,message}=helpers;
  let files={},preview=null,busy=false,generation=0,selection=0;
  const reads={manifest:0,workspace:0,photos:0};
  const error=()=>message('Chưa hoàn tất recovery. Kiểm tra đăng nhập, ba file cùng bộ và dữ liệu chưa đồng bộ; kho hiện tại được giữ nguyên.',true);
  function reset(){generation++;selection++;files={};preview=null;busy=false;}
  function render(){
    const state=workspace.read(),epoch=state.epoch,ticket=generation;
    const box=panel(h2('Recovery tài khoản'),p('Bộ recovery gồm 3 file: manifest, workspace và ảnh. Bao gồm lịch sử, bản nháp, hàng đợi và xung đột đã lưu. Chuẩn bị cần kết nối để kiểm tra đầy đủ dữ liệu tại cùng một mốc server.','hint'));
    const downloads=div('stack');
    const prepare=button('Chuẩn bị bộ recovery',async()=>{
      if(busy)return;busy=true;prepare.disabled=true;
      try{
        const packed=await workspace.recovery().export();
        if(epoch!==workspace.read().epoch||ticket!==generation||!box.isConnected)return;
        const manifest=JSON.parse(packed.manifest),names={manifest:`tracker-${manifest.exportId}-manifest.json`,workspace:manifest.files.workspace.name,photos:manifest.files.photos.name};
        downloads.replaceChildren(p('Tải đủ cả 3 file và giữ chúng cùng nhau. Các link dưới đây mới là file đã chuẩn bị; cần tải để có backup.','hint'));
        for(const kind of ['manifest','workspace','photos']){const url=URL.createObjectURL(new Blob([packed[kind]],{type:'application/json'}));registerUrl(url);downloads.append(node('a',{href:url,download:names[kind],class:'secondary',text:`Tải ${kind}`}));}
      }catch{if(epoch===workspace.read().epoch)error();}
      finally{busy=false;prepare.disabled=false;}
    });
    prepare.disabled=state.cached;box.append(prepare,downloads);
    box.append(p('Khôi phục tạo kho detached riêng, offline. Không ghi đè kho hiện tại, không tự gửi lại thao tác cũ. Chỉ chọn bộ backup của đúng tài khoản/project.','hint'));
    const review=div('stack');
    for(const kind of ['manifest','workspace','photos']){
      const input=field(`File ${kind}`,'recovery-'+kind,'',{type:'file'});input.querySelector('input').accept='.json,application/json';
      input.querySelector('input').addEventListener('change',async event=>{
        const file=event.target.files?.[0],readTicket=++reads[kind];selection++;preview=null;review.replaceChildren();delete files[kind];if(!file)return;
        try{if(file.size>(kind==='photos'?280_000_000:10_000_000))throw Error('size');const text=await file.text();if(epoch!==workspace.read().epoch||ticket!==generation||readTicket!==reads[kind])return;files[kind]=text;
          if(Object.keys(files).length===3){const selected=structuredClone(files),selectedTicket=selection,result=await workspace.recovery().preview(selected);if(epoch!==workspace.read().epoch||ticket!==generation||selectedTicket!==selection)return;preview=result;
            const counts=preview.manifest.counts;
            review.replaceChildren(p(`Đã kiểm tra hash, scope và dữ liệu. Mốc server: ${preview.manifest.head}.`,'summary'),node('pre',{class:'contract-preview',text:JSON.stringify(counts,null,2)}),button('Tạo bản khôi phục offline',()=>confirmAction('Tạo bản khôi phục detached từ bộ này? Kho đang dùng được giữ nguyên; bản mới không đồng bộ.',async()=>{
              try{if(epoch!==workspace.read().epoch||ticket!==generation||selectedTicket!==selection)throw Error('stale');const restored=await workspace.recovery().restore(selected);if(epoch!==workspace.read().epoch||ticket!==generation||selectedTicket!==selection)return;
                review.replaceChildren(p(`Đã tạo kho detached: ${restored.id}. Thiết bị mới: ${restored.deviceId}. Mọi request gốc giữ nguyên để đối chiếu. Không kết nối mạng.`, 'summary'),node('details',{},[node('summary',{text:'Xem nội dung phục hồi (chỉ đọc)'}),node('pre',{class:'contract-preview',text:JSON.stringify(restored.snapshot.workspace.data,null,2)})]));
              }catch{error();}
            })));
          }
        }catch{if(epoch===workspace.read().epoch&&ticket===generation&&readTicket===reads[kind]){preview=null;error();}}
      });box.append(input);
    }
    const saved=div('stack');
    box.append(review,button('Xem kho recovery đã lưu',async()=>{
      try{const rows=await workspace.recovery().list();if(epoch!==workspace.read().epoch||ticket!==generation||!box.isConnected)return;saved.replaceChildren();if(!rows.length)saved.append(p('Chưa có kho detached đã lưu.','hint'));
        for(const row of rows)saved.append(button(`${row.id} · mốc ${row.head}`,async()=>{
          try{const restored=await workspace.recovery().read(row.id);if(epoch!==workspace.read().epoch||ticket!==generation||!box.isConnected)return;
            const {workspace:record,jobs,ledgers,assets}=restored.snapshot;
            saved.append(node('details',{open:true},[node('summary',{text:'Recovery chỉ đọc — không gửi mạng'}),p(`${assets.length} assets; ${jobs.length} photo intents; ${ledgers.length} import ledgers. Thiết bị detached: ${restored.deviceId}.`,'hint'),node('pre',{class:'contract-preview',text:JSON.stringify(record,null,2)})]));
          }catch{error();}
        }));
      }catch{error();}
    }),saved);return box;
  }
  return {render,reset};
}
