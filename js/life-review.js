import { validDate, dailyTotals } from './data.js?v=41';
import { MOODS } from './journal.js?v=41';
import { validateSessionIdentity } from './session-identity.js?v=41';
import { validateWorkoutSnapshot, sessionTitle } from './custom-workout.js?v=41';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && value.length > 0;
const text = value => typeof value === 'string';
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const macros = ['calories', 'protein', 'carbs', 'fat'];
const sourceKeys = {journal:'journalEntries', nutrition:'entries', workout:'sessions', cardio:'cardioEntries', checkin:'checkins', knee:'kneeEntries'};
const reason = (code, domain = '') => ({code, message: code === 'arithmetic-error' ? 'Chưa tính được số liệu.' : code === 'canonical-load-error' ? 'Chưa đọc được dữ liệu đã lưu.' : code === 'photo-read-error' ? 'Chưa đọc được kho ảnh.' : `Chưa đọc được ${domain}.`});
const available = value => ({status:'available', value, reason:null});
const unavailable = cause => ({status:'unavailable', value:null, reason:cause});
const count = (value, refs) => ({state:'known', value, refs, reason:null});
const value = (state, amount, unit, refs, cause = null) => ({state, value:amount, unit, refs, reason:cause});
const ref = (kind, record) => ({kind:kind === 'photos' ? 'photo' : kind, id:record.id, date:record.date});

// Local noon retains stored calendar dates, including years 0000–0099 and DST.
function shift(date, delta) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  const year = next.getFullYear();
  if (year < 0 || year > 9999) throw new Error('Khoảng ngày ngoài phạm vi hỗ trợ');
  const result = `${String(year).padStart(4,'0')}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
  if (!validDate(result)) throw new Error('Khoảng ngày ngoài phạm vi hỗ trợ');
  return result;
}
function bounds(mode, anchor) {
  if (mode === 'week') {
    const start = shift(anchor, -(new Date(`${anchor}T12:00:00`).getDay()+6)%7);
    return {start, end:shift(start,6)};
  }
  const start = `${anchor.slice(0,7)}-01`;
  let end = start;
  for (let i=1;i<31;i++) {
    let next;
    try { next = shift(end,1); } catch { break; }
    if (next.slice(0,7) !== start.slice(0,7)) break;
    end = next;
  }
  return {start,end};
}
function supportedAnchor(mode, getAnchor) {
  try { return bounds(mode,getAnchor()).start; } catch { return null; }
}
export function lifeReviewPeriod(mode, anchor, today) {
  if (!['week','month'].includes(mode) || !text(anchor) || !text(today) || !validDate(anchor) || !validDate(today)) throw new Error('Ngày không hợp lệ.');
  const {start,end} = bounds(mode,anchor), calendarDates = [];
  for (let date=start;;date=shift(date,1)) { calendarDates.push(date); if(date===end) break; }
  const eligibleDates = calendarDates.filter(date=>date<=today);
  return {mode,anchor:start,start,end,today,relation:end<today?'past':start>today?'future':'current',calendarDates,calendarDays:calendarDates.length,
    eligibleDates,eligibleDays:eligibleDates.length,eligibleEnd:eligibleDates.at(-1)??null,
    previousAnchor:supportedAnchor(mode,()=>shift(start,mode==='week'?-7:-1)),
    nextAnchor:supportedAnchor(mode,()=>shift(end,1)),currentAnchor:supportedAnchor(mode,()=>today)};
}

function validSet(set) {
  return object(set) && id(set.id) && Number.isInteger(set.exerciseIndex) && set.exerciseIndex>=0 && text(set.exerciseName) &&
    Number.isInteger(set.setNumber) && set.setNumber>0 && number(set.weight) && Number.isInteger(set.reps) && set.reps>0 && number(set.rir) && set.rir<=10 &&
    (!set.unit || ['kg','lb'].includes(set.unit)) && (set.exerciseId === undefined || set.exerciseId === null || id(set.exerciseId));
}
function validSession(session) {
  if (!['A','B','C','D','CUSTOM'].includes(session.workout) || !Number.isInteger(session.week) || session.week<1 || session.week>12 ||
    !Array.isArray(session.sets) || !session.sets.every(validSet) || new Set(session.sets.map(set=>set.id)).size!==session.sets.length || Object.hasOwn(session,'historyEditBase') ||
    (session.workoutSnapshot != null && (!object(session.workoutSnapshot) || (session.workoutSnapshot.name !== undefined && !text(session.workoutSnapshot.name))))) return false;
  try {
    validateSessionIdentity(session);
    if (session.workout==='CUSTOM') validateWorkoutSnapshot(session.workoutSnapshot);
    // Frozen custom legacy ownership is required by the existing stored validator.
    if (!Object.hasOwn(session,'sessionStructure') && session.workout==='CUSTOM' && !session.sets.every(set=>{
      const slot=session.workoutSnapshot.exercises[set.exerciseIndex];
      return slot && slot.exerciseId===set.exerciseId && slot.name===set.exerciseName && set.setNumber<=slot.sets;
    })) return false;
    return true;
  } catch { return false; }
}
const validators = {
  journal:r=>text(r.title)&&text(r.note)&&Array.isArray(r.tags)&&r.tags.every(text),
  nutrition:r=>text(r.meal)&&id(r.foodId)&&number(r.servings)&&r.servings>0&&object(r.food)&&text(r.food.name)&&text(r.food.serving)&&
    macros.every(key=>r.food[key]===null||r.food[key]===undefined||number(r.food[key])),
  workout:validSession,
  cardio:r=>text(r.activity)&&number(r.durationMinutes)&&r.durationMinutes>0&&(r.distanceKm===null||number(r.distanceKm))&&text(r.intensity)&&text(r.notes),
  checkin:r=>['weight','waist','sleep'].every(key=>r[key]===null||number(r[key]))&&text(r.knee)&&text(r.notes),
  knee:r=>['during','after','next-morning'].includes(r.moment)&&(r.pain===null||(Number.isInteger(r.pain)&&r.pain>=0&&r.pain<=10))&&
    ['swelling','instability','stiffness'].every(key=>['unknown','no','yes'].includes(r[key]))&&text(r.notes)
};
function readDomain(dataRead, kind) {
  if (dataRead?.status!=='available') return unavailable(reason('canonical-load-error'));
  const records=dataRead.data?.[sourceKeys[kind]];
  if (!Array.isArray(records) || !records.every(record=>object(record)&&id(record.id)&&text(record.date)&&validDate(record.date)&&validators[kind](record)) ||
    new Set(records.map(record=>record.id)).size!==records.length || (kind==='journal' && new Set(records.map(record=>record.date)).size!==records.length)) return unavailable(reason('invalid-source',kind));
  return available(records);
}
function validPhoto(record) {
  return object(record)&&id(record.id)&&text(record.date)&&validDate(record.date)&&['daily','progress','gym','food','other'].includes(record.category)&&
    (record.pose===undefined||['','front','side','back'].includes(record.pose))&&(record.note===undefined||text(record.note))&&
    ['weight','waist'].every(key=>record[key]===undefined||record[key]===null||number(record[key]))&&
    (record.createdAt===undefined||text(record.createdAt))&&(record.updatedAt===undefined||text(record.updatedAt))&&
    ((record.ownerType===undefined&&record.ownerId===undefined)||(['food','recipe'].includes(record.ownerType)&&id(record.ownerId)&&record.ownerId.trim().length>0&&record.ownerId.length<=160&&record.category==='food'));
}
function readPhotos(photoRead) {
  if (photoRead?.status!=='available') return unavailable(reason('photo-read-error'));
  const records=photoRead.records;
  if (!Array.isArray(records)||!records.every(validPhoto)) return unavailable(reason('invalid-source','photos'));
  const byId=new Map();
  // Compare metadata by sorted keys; property insertion order is not photo identity.
  const signature=record=>JSON.stringify(Object.keys(record).filter(key=>!['blob','thumbnail'].includes(key)).sort().map(key=>[key,record[key]]));
  for (const record of records) {
    const existing=byId.get(record.id);
    if (existing && signature(existing)!==signature(record)) return unavailable(reason('invalid-source','photos'));
    byId.set(record.id,record);
  }
  return available([...byId.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
}
function dateRefs(records,kind) {
  const days=new Map();
  for(const record of records) {if(!days.has(record.date)) days.set(record.date,[]);days.get(record.date).push(ref(kind,record));}
  return [...days].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([date,refs])=>({date,refs}));
}
function coverage(domain,kind,period) {
  const base={calendarDays:period.calendarDays,eligibleDays:period.eligibleDays};
  if(domain.status==='unavailable')return {status:'unavailable',reason:domain.reason,...base,recordedDays:null,ratio:null,dates:[],calendarRecordedDays:null,futureRecordedDays:null};
  const dates=dateRefs(domain.value.filter(record=>record.date<=period.today),kind);
  return {status:'available',reason:null,...base,recordedDays:dates.length,ratio:period.eligibleDays?dates.length/period.eligibleDays:null,dates,
    calendarRecordedDays:new Set(domain.value.map(record=>record.date)).size,futureRecordedDays:new Set(domain.value.filter(record=>record.date>period.today).map(record=>record.date)).size};
}
function moods(journals,period) {
  if(journals.status==='unavailable')return journals;
  if(!journals.value.every(record=>record.mood===''||MOODS.some(mood=>mood.value===record.mood)))return unavailable(reason('invalid-source','mood'));
  const known=journals.value.filter(record=>record.mood),missing=journals.value.filter(record=>!record.mood),knownDates=new Set(known.map(record=>record.date));
  return available({knownDays:known.length,missingMoodJournalDays:missing.length,missingMoodSources:missing.map(record=>ref('journal',record)),
    unrecordedEligibleDays:period.eligibleDays-journals.value.length,unrecordedMoodDates:period.eligibleDates.filter(date=>!knownDates.has(date)),
    buckets:MOODS.map(mood=>{const records=known.filter(record=>record.mood===mood.value);return {id:mood.value,label:mood.label,mark:mood.mark,count:records.length,denominator:known.length,dates:records.map(record=>record.date).sort(),refs:records.map(record=>ref('journal',record))};})});
}
function tags(journals) {
  if(journals.status==='unavailable')return journals;
  const buckets=new Map(),days=new Set();
  for(const record of [...journals.value].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)) {
    const seen=new Set();
    for(const saved of record.tags) {
      const label=saved.trim(),key=label.toLocaleLowerCase('vi');
      if(!key||seen.has(key))continue;
      seen.add(key);days.add(record.date);
      if(!buckets.has(key))buckets.set(key,{key,label,dayCount:0,denominator:0,dates:[],refs:[]});
      const bucket=buckets.get(key);bucket.dayCount++;bucket.dates.push(record.date);bucket.refs.push(ref('journal',record));
    }
  }
  return available({tagDays:days.size,buckets:[...buckets.values()].map(bucket=>({...bucket,denominator:days.size}))});
}
function workouts(domain) {
  if(domain.status==='unavailable')return domain;
  const sessions=domain.value.map(session=>{
    const structured=Object.hasOwn(session,'sessionStructure'),groups=new Map();
    const slots=structured?new Map(session.sessionStructure.slots.map(slot=>[slot.id,slot])):null;
    const setRef=set=>({kind:'set',id:set.id,date:session.date,sessionId:session.id,slotId:structured?set.slotId:null,legacyIndex:structured?null:set.exerciseIndex});
    for(const set of session.sets) {const key=structured?set.slotId:set.exerciseIndex;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(set);}
    const occurrences=[],unresolvedSetRefs=[];
    for(const [key,sets] of groups) {
      const numbers=new Set(sets.map(set=>set.setNumber)),names=new Set(sets.map(set=>set.exerciseName)),ids=new Set(sets.filter(set=>set.exerciseId!=null).map(set=>set.exerciseId));
      if(!structured&&(numbers.size!==sets.length||names.size!==1||ids.size>1)) {unresolvedSetRefs.push(...sets.map(setRef));continue;}
      occurrences.push({ownerKey:JSON.stringify([session.id,structured?'slot':'legacy',key]),slotId:structured?key:null,name:structured?slots.get(key).snapshot.name:sets[0].exerciseName,setRefs:sets.map(setRef)});
    }
    return {ref:ref('workout',session),title:sessionTitle(session),setRefs:session.sets.map(setRef),occurrences,ownershipState:unresolvedSetRefs.length?'unknown':'known',unresolvedSetRefs};
  });
  const allSets=sessions.flatMap(session=>session.setRefs),proven=sessions.flatMap(session=>session.occurrences),provenRefs=proven.flatMap(occurrence=>occurrence.setRefs),unresolved=sessions.flatMap(session=>session.unresolvedSetRefs);
  return available({sessionCount:count(sessions.length,sessions.map(session=>session.ref)),savedSetCount:count(allSets.length,allSets),
    performedOccurrenceCount:value(unresolved.length?'unknown':'known',unresolved.length?null:proven.length,'count',allSets),provenOccurrenceCount:count(proven.length,provenRefs),unresolvedSetCount:count(unresolved.length,unresolved),sessions,
    muscleEvidence:{state:proven.length||unresolved.length?'unknown':'missing',denominator:unresolved.length?null:proven.length,knownCount:0,unknownProvenCount:proven.length,unresolvedSetCount:unresolved.length,
      buckets:proven.length?[{key:'unknown',label:'Không xác định',count:proven.length,refs:provenRefs}]:[]}});
}
function nutrition(domain,period) {
  if(domain.status==='unavailable')return domain;
  const records=domain.value,groups=dateRefs(records,'nutrition');
  const byDate=new Map();for(const record of records){if(!byDate.has(record.date))byDate.set(record.date,[]);byDate.get(record.date).push(record);}
  const days=groups.map(({date,refs})=>{
    const entries=byDate.get(date),canonical=dailyTotals(entries,date),totals={},totalsState={};
    for(const key of macros) {
      // Detect invalid arithmetic even when another snapshot field is unknown.
      let sum=0,overflow=false;
      for(const entry of entries)if(entry.food[key]!=null){const product=entry.food[key]*entry.servings;sum+=product;if(!Number.isFinite(product)||!Number.isFinite(sum))overflow=true;}
      totalsState[key]=overflow?'unavailable':canonical[key]===null?'unknown':'known';totals[key]=totalsState[key]==='known'?canonical[key]:null;
    }
    return {date,entryRefs:refs,mealLabels:[...new Set(entries.map(entry=>entry.meal))],totals,totalsState};
  });
  const derived={};
  for(const key of macros) {
    const known=days.filter(day=>day.totalsState[key]==='known'),unknown=days.filter(day=>day.totalsState[key]==='unknown'),failed=days.filter(day=>day.totalsState[key]==='unavailable');
    const subtotal=known.reduce((sum,day)=>sum+day.totals[key],0),error=failed.length>0||!Number.isFinite(subtotal),unit=key==='calories'?'kcal':'g',allRefs=days.flatMap(day=>day.entryRefs),knownRefs=known.flatMap(day=>day.entryRefs);
    const fullState=error?'unavailable':!days.length?'missing':unknown.length?'unknown':'known',knownState=error?'unavailable':known.length?'known':days.length?'unknown':'missing',cause=error?reason('arithmetic-error'):null;
    const subsetRefs=error||knownState==='unknown'?allRefs:knownRefs;
    derived[key]={fullTotal:value(fullState,fullState==='known'?subtotal:null,unit,allRefs,cause),knownSubtotal:value(knownState,knownState==='known'?subtotal:null,unit,subsetRefs,cause),
      knownDayAverage:value(knownState,knownState==='known'?subtotal/known.length:null,unit,subsetRefs,cause),loggedDays:days.length,knownDays:known.length,unknownDays:unknown.length,unavailableDays:failed.length,
      knownDates:known.map(day=>day.date),unknownDates:unknown.map(day=>day.date),unavailableDates:failed.map(day=>day.date),unrecordedEligibleDays:period.eligibleDays-days.length};
  }
  return available({entryCount:count(records.length,records.map(record=>ref('nutrition',record))),loggedDays:days.length,days,macros:derived});
}
function recordCount(domain,kind) {
  return domain.status==='unavailable'?domain:available({recordCount:count(domain.value.length,domain.value.map(record=>ref(kind,record)))});
}
function reviewCommon(dataRead,photoRead,period) {
  const today=period.today,sources={},full={},eligible={},unavailableDomains=[],futureRecords={},coverages={};
  for(const kind of [...Object.keys(sourceKeys),'photos']) {
    const source=kind==='photos'?readPhotos(photoRead):readDomain(dataRead,kind);
    sources[kind]=source;
    full[kind]=source.status==='unavailable'?source:available(source.value.filter(record=>record.date>=period.start&&record.date<=period.end));
    eligible[kind]=full[kind].status==='unavailable'?full[kind]:available(full[kind].value.filter(record=>record.date<=today));
    if(source.status==='unavailable')unavailableDomains.push({domain:kind,reason:source.reason});
    coverages[kind]=coverage(full[kind],kind,period);
    const future=full[kind].status==='unavailable'?null:full[kind].value.filter(record=>record.date>today);
    futureRecords[kind]=future===null?full[kind]:available({recordCount:count(future.length,future.map(record=>ref(kind,record))),sources:future.map(record=>ref(kind,record))});
  }
  const moodValid=full.journal.status==='unavailable'?full.journal:full.journal.value.every(record=>record.mood===''||MOODS.some(mood=>mood.value===record.mood))?available(full.journal.value.filter(record=>record.mood)):unavailable(reason('invalid-source','mood'));
  // Validate mood across the entire consumed domain, including records outside the period.
  const rawJournal=sources.journal;
  const moodFailure=rawJournal.status==='available'&&!rawJournal.value.every(record=>record.mood===''||MOODS.some(mood=>mood.value===record.mood));
  coverages.mood=coverage(moodFailure?unavailable(reason('invalid-source','mood')):moodValid,'journal',period);
  if(moodFailure)unavailableDomains.push({domain:'mood',reason:reason('invalid-source','mood')});
  const dayMap=new Map();
  for(const kind of Object.keys(full))if(full[kind].status==='available')for(const day of dateRefs(full[kind].value,kind)) {if(!dayMap.has(day.date))dayMap.set(day.date,[]);dayMap.get(day.date).push(...day.refs);}
  const sourceDays=[...dayMap].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([date,refs])=>({date,refs}));
  const common={period,empty:sourceDays.length?false:unavailableDomains.length?null:true,coverage:{journal:coverages.journal,mood:coverages.mood,nutrition:coverages.nutrition,workout:coverages.workout,cardio:coverages.cardio,checkin:coverages.checkin,knee:coverages.knee,photos:coverages.photos},
    futureRecords,unavailableDomains,sourceDays};
  return {common,full,eligible,moodFailure};
}
export function deriveLifeWeek(dataRead,photoRead,weekAnchor,today) {
  const period=lifeReviewPeriod('week',weekAnchor,today),{common,eligible,moodFailure}=reviewCommon(dataRead,photoRead,period);
  const moodOutput=moodFailure?unavailable(reason('invalid-source','mood')):moods(eligible.journal,period);
  let minutes;
  if(eligible.cardio.status==='unavailable')minutes=eligible.cardio;
  else {
    const refs=eligible.cardio.value.map(record=>ref('cardio',record)),sum=eligible.cardio.value.reduce((total,record)=>total+record.durationMinutes,0);
    minutes=available({recordCount:count(refs.length,refs),minutes:!Number.isFinite(sum)?value('unavailable',null,'min',refs,reason('arithmetic-error')):value(refs.length?'known':'missing',refs.length?sum:null,'min',refs)});
  }
  return {...common,journal:recordCount(eligible.journal,'journal'),moods:moodOutput,tags:tags(eligible.journal),workouts:workouts(eligible.workout),nutrition:nutrition(eligible.nutrition,period),
    cardio:minutes,checkins:recordCount(eligible.checkin,'checkin'),knees:recordCount(eligible.knee,'knee'),photos:eligible.photos.status==='unavailable'?eligible.photos:available({photoCount:count(eligible.photos.value.length,eligible.photos.value.map(record=>ref('photos',record))),photoDays:new Set(eligible.photos.value.map(record=>record.date)).size})};
}

function memoryPreview(kind,record) {
  switch(kind) {
    case 'journal': {
      const characters=Array.from(record.note);
      const moodID=record.mood===''||MOODS.some(mood=>mood.value===record.mood)?record.mood:null;
      return {title:record.title,noteExcerpt:characters.slice(0,280).join('')+(characters.length>280?'…':''),moodID,tags:[...record.tags]};
    }
    case 'workout':return {savedTitle:sessionTitle(record),setCount:record.sets.length};
    case 'nutrition':return {name:record.food.name,serving:record.food.serving,servings:record.servings,meal:record.meal};
    case 'cardio':return {activity:record.activity,durationMinutes:record.durationMinutes,distanceKm:record.distanceKm,intensity:record.intensity};
    case 'checkin':return {weight:record.weight,waist:record.waist,sleep:record.sleep,knee:record.knee,notes:record.notes};
    case 'knee':return {moment:record.moment,pain:record.pain,swelling:record.swelling,instability:record.instability,stiffness:record.stiffness,notes:record.notes};
    case 'photos':return {category:record.category,...(record.pose===undefined?{}:{pose:record.pose}),...(record.note===undefined?{}:{note:record.note})};
  }
}
export function deriveMonthMemories(dataRead,photoRead,monthAnchor,today) {
  const period=lifeReviewPeriod('month',monthAnchor,today),{common,full}=reviewCommon(dataRead,photoRead,period),counts={},days=new Map();
  for(const kind of ['journal','workout','nutrition','cardio','checkin','knee','photos']) {
    const domain=full[kind];
    counts[kind]=domain.status==='unavailable'?{state:'unavailable',value:null,refs:[],reason:domain.reason}:count(domain.value.length,domain.value.map(record=>ref(kind,record)));
    if(domain.status==='unavailable')continue;
    const groups=new Map();
    for(const record of domain.value) {
      if(!groups.has(record.date))groups.set(record.date,[]);
      groups.get(record.date).push({ref:ref(kind,record),preview:memoryPreview(kind,record)});
    }
    for(const [date,items] of groups) {
      if(!days.has(date))days.set(date,{date,temporalState:date<=today?'eligible':'future',groups:[]});
      days.get(date).groups.push({kind:kind==='photos'?'photo':kind,items});
    }
  }
  return {...common,counts,timeline:[...days.values()].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)};
}
