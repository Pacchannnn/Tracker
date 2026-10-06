import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJournalText, journalTagOptions, retrieveJournalEntries } from '../js/journal.js';
import { emptyData, createBackup, parseBackup, loadData } from '../js/data.js';
const journal=(id,date,fields={})=>({id,date,mood:'drained',title:'',note:'',tags:[],createdAt:'2026-10-06T00:00:00Z',updatedAt:'2026-10-06T00:00:00Z',...fields});
const sample=()=>[
 journal('a','2026-10-03',{title:'Mệt nhưng vẫn đọc sách',tags:['Đọc sách','Gym']}),
 journal('b','2026-10-05',{note:'Tập   GYM\n sau giờ học',tags:['GYM','Đi bộ']}),
 journal('c','2026-10-04',{tags:['Nấu ăn','đọc SÁCH']}),
 journal('d','2026-10-06',{title:'Bình thường',note:'<img src=x onerror=alert(1)>',tags:['<b>Thẻ</b>']})
];
const ids=result=>result.entries.map(e=>e.id);
const many=()=>Array.from({length:75},(_,i)=>{const day=new Date(2026,9,6-i,12); const date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;return journal(`j${i}`,date,{title:i===54?'Tìm đặc biệt nhật ký cũ':`Ngày ${i}`,note:i<45?'Lịch sử chung':'',tags:i%2?['Đi bộ']:['Gym','Đọc sách']});});
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
test('Vietnamese search folds accents/case/đ and collapses whitespace without rewriting strings',()=>{
 assert.equal(normalizeJournalText('  ĐỌC\t SÁCH  '),'doc sach');assert.equal(normalizeJournalText('Mệt'),'met');
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{query:'mET'})),['a']);
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{query:'  TAP\n GYM  '})),['b']);
});
test('search reads exact title, note and each tag; never invents cross-field phrases or mood matches',()=>{
 const entries=sample();assert.deepEqual(ids(retrieveJournalEntries(entries,{query:'binh thuong'})),['d']);assert.deepEqual(ids(retrieveJournalEntries(entries,{query:'sau gio hoc'})),['b']);assert.deepEqual(ids(retrieveJournalEntries(entries,{query:'nau an'})),['c']);
 entries.push(journal('split','2026-10-07',{title:'Tập',note:'Gym'}));assert.deepEqual(ids(retrieveJournalEntries(entries,{query:'tap gym'})),['b']);assert.deepEqual(ids(retrieveJournalEntries(entries,{query:'drained'})),[]);
});
test('blank query has no text filter; empty history and no-match have distinct counts',()=>{
 for(const query of ['', '  \n\t ',null])assert.deepEqual(ids(retrieveJournalEntries(sample(),{query})),['d','b','c','a']);
 assert.equal(retrieveJournalEntries([]).total,0);assert.equal(retrieveJournalEntries(sample(),{query:'missing'}).total,0);assert.equal(retrieveJournalEntries(sample()).total,4);
});
test('tag options are original most-recent labels, normalized deduped, no taxonomy or source edit',()=>{
 const data=sample(),before=structuredClone(data);assert.deepEqual(journalTagOptions(data),['<b>Thẻ</b>','GYM','Đi bộ','Nấu ăn','đọc SÁCH']);assert.deepEqual(data,before);
});
test('single tag matches exact normalized equality, not partial tag names',()=>{
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{tags:['doc SACH']})),['c','a']);assert.deepEqual(ids(retrieveJournalEntries(sample(),{tags:['doc']})),[]);
});
test('multiple tags use ALL and query + selected tags compose with AND',()=>{
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{tags:['gym','DOC SACH']})),['a']);
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{tags:['GYM','di bo'],query:'tap gym'})),['b']);
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{tags:['gym','doc sach'],query:'tap gym'})),[]);
});
test('descending calendar date order is stable; timestamps do not shift chronology',()=>{
 const e=sample();e[0].updatedAt='2099-01-01T00:00:00Z';e.push(journal('same','2026-10-05',{title:'same'}));assert.deepEqual(ids(retrieveJournalEntries(e)),['d','b','same','c','a']);
});
test('full-history search finds entry55 without requiring first30 or LoadMore',()=>{
 const entries=many();assert.equal(retrieveJournalEntries(entries).entries.length,30);assert.deepEqual(ids(retrieveJournalEntries(entries,{query:'dac biet'})),['j54']);
});
test('75 records paginate30→60→75 with no duplicate/skip and a final partial15',()=>{
 const e=many();const a=retrieveJournalEntries(e,{limit:30}),b=retrieveJournalEntries(e,{limit:60}),c=retrieveJournalEntries(e,{limit:90});assert.equal(a.hasMore,true);assert.equal(b.hasMore,true);assert.equal(c.hasMore,false);assert.equal(c.total,75);
 const pages=[...a.entries,...b.entries.slice(30),...c.entries.slice(60)];assert.equal(pages.length,75);assert.equal(new Set(pages.map(e=>e.id)).size,75);assert.deepEqual(pages.map(e=>e.id),e.map(e=>e.id));
});
test('filter THEN paging yields45 results and final15, not search of visible30',()=>{
 const e=many();const a=retrieveJournalEntries(e,{query:'lich su chung',limit:30}),b=retrieveJournalEntries(e,{query:'lich su chung',limit:60});assert.equal(a.total,45);assert.equal(a.entries.length,30);assert.equal(b.entries.length,45);assert.equal(b.hasMore,false);assert.deepEqual(ids(b).slice(30),e.slice(30,45).map(e=>e.id));
});
test('reset limit and Clear restores first30 of normal history without source changes',()=>{
 const e=many(),before=structuredClone(e);retrieveJournalEntries(e,{query:'lich su chung',tags:['Gym'],limit:60});const reset=retrieveJournalEntries(e,{query:'lich su chung',limit:30});assert.equal(reset.entries.length,30);assert.deepEqual(ids(retrieveJournalEntries(e,{query:'',tags:[],limit:30})),e.slice(0,30).map(e=>e.id));assert.deepEqual(e,before);
});
test('source edits remove stale matches and source delete disappears on next derive',()=>{
 const e=many();assert.deepEqual(ids(retrieveJournalEntries(e,{query:'dac biet',tags:['gym']})),['j54']);e[54].title='Đã sửa';assert.equal(retrieveJournalEntries(e,{query:'dac biet'}).total,0);assert.deepEqual(ids(retrieveJournalEntries(e,{query:'da sua'})),['j54']);e.splice(54,1);assert.equal(retrieveJournalEntries(e,{query:'da sua'}).total,0);
});
test('pure retrieval/options on deep-frozen source performs zero storage writes and preserves schema8 backup',()=>{
 const d=emptyData();d.journalEntries=many();const before=createBackup(d),raw=JSON.stringify(d);let writes=0;const storage={getItem:()=>raw,setItem(){writes++;throw Error('write');}};const loaded=freeze(loadData(storage));
 journalTagOptions(loaded.journalEntries);for(const query of ['dac biet','','missing'])retrieveJournalEntries(loaded.journalEntries,{query,limit:60,tags:[]});assert.equal(writes,0);assert.deepEqual(parseBackup(before).data,d);assert.equal(d.schemaVersion,8);
});
test('literal HTML/query/tag stays ordinary searchable text, not parsed markup',()=>{
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{query:'<img src=x'})),['d']);assert.deepEqual(ids(retrieveJournalEntries(sample(),{tags:['<B>the</B>']})),['d']);assert.equal(sample()[3].note,'<img src=x onerror=alert(1)>');
});
test('malformed source fields fail closed instead of skipping/repairing, optional filter null is safe',()=>{
 for(const bad of [null,{},[null],[journal('bad','not-date')],[journal('bad','2026-10-01',{title:{html:'bad'}})],[journal('bad','2026-10-01',{note:null})],[journal('bad','2026-10-01',{tags:'Gym'})],[journal('bad','2026-10-01',{tags:[1]})]])assert.throws(()=>retrieveJournalEntries(bad),/nhật ký/);
 for(const limit of [0,-1,1.5,NaN,Infinity])assert.throws(()=>retrieveJournalEntries(sample(),{limit}),/số lượng/i);
 assert.deepEqual(ids(retrieveJournalEntries(sample(),{query:null,tags:null})),['d','b','c','a']);assert.throws(()=>retrieveJournalEntries(sample(),{tags:{}}),/thẻ/i);
});
