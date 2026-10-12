export function createImportUI({workspace,helpers}){
  const {node,button,panel,div,p,h2,field,confirmAction,message}=helpers;
  let source=null,photos=null,ledger=null,choices={},reviewed=new Set(),limit=20,generation=0,action=0;
  const reads={source:0,photos:0};
  const pendingReads=new Set();
  function reset(){source=photos=ledger=null;choices={};reviewed=new Set();pendingReads.clear();limit=20;generation++;action++;}
  function render(){
    const state=workspace.read(),epoch=state.epoch,ticket=generation;
    const guard=()=>{if(epoch!==workspace.read().epoch||ticket!==generation)throw Error('stale');};
    const current=operation=>epoch===workspace.read().epoch&&ticket===generation&&operation===action;
    const box=panel(h2('Nhập dữ liệu có review'),p('Hiện chỉ rehearsal bằng file synthetic. Dữ liệu cá nhân cần duyệt riêng sau kiểm thử. Chọn file; không tự đọc hoặc ghi đè kho cục bộ. Trước khi queue, tải đủ bộ recovery của tài khoản.','hint'));
    const output=div('stack'),status=p('Chưa chọn file.','hint');
    const synthetic=field('Tôi dùng dữ liệu synthetic và đã giữ bản recovery','import-consent','',{type:'checkbox'});
    box.append(synthetic);
    for(const [kind,label,cap] of [['source','JSON schema 8 nguồn',10_000_000],['photos','Ảnh photo1 nguồn (tùy chọn, giữ local)',280_000_000]]){
      const input=field(label,'import-'+kind,'',{type:'file'});input.querySelector('input').accept='.json,application/json';
      input.querySelector('input').addEventListener('change',async event=>{
        const file=event.target.files?.[0],readTicket=++reads[kind];action++;ledger=null;output.replaceChildren();if(kind==='source')source=null;else photos=null;
        pendingReads.delete(kind);if(!file)return;pendingReads.add(kind);status.textContent='Đang đọc file đã chọn…';try{if(file.size>cap)throw Error('file_limit');const text=await file.text();guard();if(readTicket!==reads[kind])return;if(kind==='source')source=text;else photos=text;status.textContent='Đã chọn file. Chưa queue hoặc đồng bộ.';}catch{if(epoch===workspace.read().epoch&&ticket===generation&&readTicket===reads[kind])message('File quá lớn hoặc không đọc được. Nguồn được giữ nguyên.',true);}finally{if(ticket===generation&&readTicket===reads[kind])pendingReads.delete(kind);}
      });box.append(input);
    }
    function showLedger(){
      output.replaceChildren();if(!ledger)return;
      output.append(p(`Ledger ${ledger.id} · ${ledger.state} · ${ledger.batches.length} batch đã duyệt · ${ledger.acceptedReceipts.length} ACK`,'summary'));
      if(ledger.state==='review'){
        const all=[...ledger.preview.candidates.map(item=>({candidate:item})),...ledger.unresolved.map(item=>({unresolved:item}))];
        output.append(p('Chọn từng mục muốn nhập. Mặc định giữ local. Unknown, collision, bản nháp/ownership cũ và ảnh nguồn được giữ nguyên, không tự chuyển.','hint'));
        for(const item of all.slice(0,limit)){
          if(item.candidate){const c=item.candidate,key=JSON.stringify([c.kind,c.recordId]);
            const choice=field(`${c.kind} · ${c.recordId}`,'import-choice-'+key,choices[key]??'keep-local',{tag:'select',choices:[{value:'keep-local',label:'Giữ local'},{value:'import',label:'Nhập bản này'}]});
            choice.querySelector('select').addEventListener('change',event=>{action++;choices[key]=event.target.value;});output.append(choice);
          }else {const c=item.unresolved,choice=field(`Giữ local: ${c.reason} · ${c.recordId??c.field??c.photoId??''}`,'import-review-'+c.reviewId,'',{type:'checkbox'});
            choice.querySelector('input').checked=reviewed.has(c.reviewId);choice.querySelector('input').addEventListener('change',event=>{action++;if(event.target.checked)reviewed.add(c.reviewId);else reviewed.delete(c.reviewId);});output.append(choice);
          }
        }
        if(limit<all.length)output.append(button('Xem thêm mục review',()=>{limit+=20;showLedger();}));
        output.append(button('Lưu lựa chọn đã review',async()=>{
          try{guard();if(!synthetic.querySelector('input').checked||reviewed.size!==ledger.unresolved.length)throw Error('review');
            const decisions=[...ledger.preview.candidates.map(c=>({kind:c.kind,recordId:c.recordId,action:choices[JSON.stringify([c.kind,c.recordId])]??'keep-local'})),...ledger.unresolved.map(c=>({reviewId:c.reviewId,action:'keep-local'}))];
            const operation=++action,result=await workspace.importer().plan(ledger.id,decisions,true);if(!current(operation))return;ledger=result;showLedger();
          }catch{message('Review chưa đủ hoặc bản chọn không hợp lệ. Hãy giữ local mục chưa hỗ trợ; nguồn và ledger được giữ nguyên.',true);}
        }));
      }else{
        output.append(p('Ảnh nguồn và các mục giữ local chưa được chuyển. Accepted chỉ có nghĩa những batch đã chọn có ACK; không có nghĩa đã nhập toàn bộ nguồn.','hint'));
        const selectedId=ledger.id,selectedAction=action;
        output.append(button('Queue / tiếp tục batch đã duyệt',()=>confirmAction('Queue đúng các batch đã duyệt vào kho tài khoản? Thao tác chưa gửi mạng; hãy dùng Đồng bộ ngay sau khi preview synthetic được bật.',async()=>{
          try{guard();if(!current(selectedAction)||!synthetic.querySelector('input').checked)throw Error('consent');const operation=++action,result=await workspace.importer().resume(selectedId);if(!current(operation))return;ledger=result;showLedger();message('Đã lưu queue / receipt tiến độ. Chưa tự gửi dữ liệu.');}catch{message('Chưa queue được: target đã đổi hoặc thiếu review. Dữ liệu nguồn được giữ nguyên.',true);}
        })));
      }
    }
    box.append(button('Chuẩn bị ledger từ file',async()=>{try{guard();if(pendingReads.size){message('File đã chọn đang được đọc. Chờ đọc xong rồi chuẩn bị ledger.',true);return;}if(!source||!synthetic.querySelector('input').checked)throw Error('consent');const operation=++action,result=await workspace.importer().prepare(source,photos);if(!current(operation))return;ledger=result;choices={};reviewed=new Set();limit=20;showLedger();}catch{message('Chọn JSON hợp lệ và xác nhận rehearsal synthetic trước. Chưa nhập dữ liệu.',true);}}),status,output);
    const saved=div('stack');box.append(button('Xem ledger đã lưu',async()=>{try{const ledgers=await workspace.importer().list();guard();saved.replaceChildren();if(!ledgers.length)saved.append(p('Chưa có ledger đã lưu.','hint'));for(const row of ledgers)saved.append(button(`${row.id} · ${row.state}`,async()=>{try{const operation=++action,result=await workspace.importer().read(row.id);if(!current(operation))return;ledger=result;choices={};reviewed=new Set();limit=20;showLedger();}catch{message('Ledger không hợp lệ hoặc thuộc scope khác.',true);}}));}catch{message('Không đọc được ledger.',true);}}),saved);
    showLedger();return box;
  }
  return {render,reset};
}
