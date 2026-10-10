import { validateEntry, foodSnapshotForEntry, ensureUnchanged, validDate } from './data.js?v=41';

function checkedSnapshot(food) {
  if (!food || typeof food.name !== 'string' || !food.name.trim() || typeof food.serving !== 'string' || !food.serving.trim() ||
    !['calories','protein','carbs','fat'].every(key => typeof food[key] === 'number' && Number.isFinite(food[key]) && food[key] >= 0)) {
    throw new Error('Món cần tên, khẩu phần và đủ 4 macro hợp lệ; không đổi giá trị chưa rõ thành 0.');
  }
  return structuredClone(food);
}

export function nutritionChoice(data, type, sourceId) {
  if (!['food','recipe'].includes(type)) throw new Error('Loại món không hợp lệ.');
  const source = (type === 'food' ? data.foods : data.recipes).find(item => item.id === sourceId);
  let food = null, reason = '';
  try {
    if (!source) throw new Error('Nguồn đã xóa hoặc không còn trong thư viện.');
    food = checkedSnapshot(type === 'food' ? foodSnapshotForEntry(null,sourceId,data.foods) :
      { name:source.name, serving:'1 phần', ...source.nutritionPerServing });
  } catch (error) { reason = error.message; }
  return { key:`${type}:${sourceId}`, type, sourceId, name:source?.name || 'Nguồn không còn', food, selectable:!!food, reason };
}

export function recentNutritionChoices(data, meal, { limit = 6 } = {}) {
  const usage = data.entries.map((entry,index) => ({entry,index})).sort((a,b) =>
    b.entry.date.localeCompare(a.entry.date) || b.index-a.index);
  const seen = new Set(), results = [];
  for (const group of ['meal','global']) for (const {entry} of usage) {
    if (group === 'meal' && entry.meal !== meal) continue;
    const type = entry.foodId.startsWith('recipe:') ? 'recipe' : 'food';
    const sourceId = type === 'recipe' ? entry.foodId.slice(7) : entry.foodId;
    const choice = nutritionChoice(data,type,sourceId);
    if (seen.has(choice.key)) continue;
    seen.add(choice.key);
    results.push({...choice, name:choice.selectable ? choice.name : entry.food.name, group, date:entry.date});
    if (results.length >= limit) return results;
  }
  return results;
}

export function selectNutritionRow(rows, data, type, sourceId) {
  const choice = nutritionChoice(data,type,sourceId);
  if (!choice.selectable) throw new Error(choice.reason);
  if (rows.some(row => row.key === choice.key)) return [...rows];
  const source = (type === 'food' ? data.foods : data.recipes).find(item => item.id === sourceId);
  return [...rows, { ...choice, baseline:structuredClone(source), servings:'1' }];
}

export function selectCopyRow(rows, data, sourceId) {
  const source = data.entries.find(item => item.id === sourceId);
  if (!source) throw new Error('Bản ghi nguồn không còn.');
  const food = checkedSnapshot(source.food), key = `copy:${sourceId}`;
  if (rows.some(row => row.key === key)) return [...rows];
  return [...rows, {key,type:'copy',sourceId,name:food.name,food,baseline:structuredClone(source),servings:String(source.servings)}];
}

function validatedRecords(data, request) {
  if (!validDate(request.date)) throw new Error('Ngày đích không hợp lệ.');
  if (!Array.isArray(request.rows) || !request.rows.length) throw new Error('Chọn ít nhất một món.');
  if (new Set(request.rows.map(row=>row.key)).size !== request.rows.length) throw new Error('Món bị chọn trùng trong batch.');
  return request.rows.map(row => {
    if (!['food','recipe','copy'].includes(row.type) || row.key !== `${row.type}:${row.sourceId}`) throw new Error('Mục review không hợp lệ.');
    const source = (row.type==='copy' ? data.entries : row.type==='food' ? data.foods : data.recipes).find(item=>item.id===row.sourceId);
    ensureUnchanged(source,row.baseline);
    const food = checkedSnapshot(row.type==='copy' ? source.food : nutritionChoice(data,row.type,row.sourceId).food);
    // The preview must be the exact accepted snapshot, not silently replaced by a live definition.
    ensureUnchanged(food,row.food);
    const values = validateEntry({date:request.date,meal:request.meal===null && row.type==='copy' ? source.meal : request.meal,servings:row.servings});
    const foodId = row.type==='copy' ? source.foodId : row.type==='recipe' ? `recipe:${row.sourceId}` : row.sourceId;
    return { ...(row.type==='copy' ? structuredClone(source) : {}), ...values, foodId, food };
  });
}

export function reviewNutritionBatch(data, request) {
  validatedRecords(data,request);
  return structuredClone({...request,destination:data.entries.filter(item=>item.date===request.date)});
}

export function buildNutritionBatch(data, review, createId) {
  ensureUnchanged(data.entries.filter(item=>item.date===review.date),review.destination);
  const records = validatedRecords(data,review), ids = new Set(data.entries.map(item=>item.id));
  return records.map(record=>{
    const id=createId();
    if (typeof id!=='string' || !id || ids.has(id)) throw new Error('Không tạo được ID mới duy nhất; chưa ghi batch.');
    ids.add(id); return {...record,id};
  });
}

export function createNutritionBatchWriter({ write, createId }) {
  let saving = false;
  const accepted = new WeakSet();
  return { async commit(review) {
    if (saving || accepted.has(review)) throw new Error('Batch đang lưu hoặc đã lưu; không thêm trùng.');
    saving=true;
    try {
      const next = await write(data=>{ data.entries.push(...buildNutritionBatch(data,review,createId)); });
      accepted.add(review); return next;
    } finally { saving=false; }
  } };
}
