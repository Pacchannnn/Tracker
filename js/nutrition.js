export function recentFoods(foods, entries) {
  const lastUsed = new Map();
  for (const entry of entries) {
    const previous = lastUsed.get(entry.foodId) || '';
    if (entry.date > previous) lastUsed.set(entry.foodId, entry.date);
  }
  return [...foods].sort((a, b) => (lastUsed.get(b.id) || '').localeCompare(lastUsed.get(a.id) || '') || a.name.localeCompare(b.name));
}

export function searchFoods(foods, entries, query) {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').replace(/đ/g, 'd').trim();
  const term = normalize(query);
  return recentFoods(foods, entries).filter(food => normalize(food.name).includes(term));
}

export function copyDayEntries(entries, sourceDate, targetDate, createId) {
  const source = entries.filter(item => item.date === sourceDate);
  if (!source.length) throw new Error('Ngày nguồn chưa có món ăn để sao chép.');
  return source.map(item => ({ ...structuredClone(item), id: createId(), date: targetDate }));
}

export function savedMealFromEntries(name, entries, date, meal, createId) {
  const title = String(name || '').trim();
  if (!title) throw new Error('Tên bữa ăn lưu sẵn là bắt buộc.');
  const source = entries.filter(item => item.date === date && item.meal === meal);
  if (!source.length) throw new Error('Bữa này chưa có món để lưu.');
  return {
    id: createId(), name: title,
    items: source.map(item => ({ foodId: item.foodId, food: structuredClone(item.food), servings: item.servings }))
  };
}

export function useSavedMeal(template, date, meal, createId) {
  return template.items.map(item => ({ id: createId(), date, meal, foodId: item.foodId, food: structuredClone(item.food), servings: item.servings }));
}

export function validateRecipe(raw) {
  const name = String(raw.name ?? '').trim();
  const servings = Number(raw.servings);
  if (!name) throw new Error('Tên công thức là bắt buộc.');
  if (!Number.isFinite(servings) || servings <= 0 || servings > 100) throw new Error('Số phần ăn không hợp lệ.');
  const lines = String(raw.ingredients ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const ingredients = Array.isArray(raw.ingredients) ? structuredClone(raw.ingredients) : lines.map(line => {
    const parts = line.split('|').map(part => part.trim());
    const quantity = Number(parts[0]);
    if (parts.length !== 3 || !Number.isFinite(quantity) || quantity <= 0 || !parts[1] || !parts[2]) {
      throw new Error('Nguyên liệu cần dạng: số lượng | đơn vị | tên.');
    }
    return { quantity, unit: parts[1], name: parts[2] };
  });
  if (!ingredients.every(item => item && Number.isFinite(item.quantity) && item.quantity > 0 && typeof item.unit === 'string' && typeof item.name === 'string')) throw new Error('Nguyên liệu có cấu trúc không hợp lệ.');
  if (!ingredients.length) throw new Error('Nhập ít nhất một nguyên liệu.');
  const steps = Array.isArray(raw.steps) ? structuredClone(raw.steps) : String(raw.steps ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!steps.every(step => typeof step === 'string')) throw new Error('Bước nấu không hợp lệ.');
  if (!steps.length) throw new Error('Nhập ít nhất một bước nấu.');
  const keys = ['calories', 'protein', 'carbs', 'fat'];
  const values = keys.map(key => raw[key]);
  const hasAny = values.some(value => value !== '' && value !== null && value !== undefined);
  const nutritionPerServing = hasAny ? Object.fromEntries(keys.map(key => {
    const value = Number(raw[key]);
    if (raw[key] === '' || raw[key] === null || raw[key] === undefined || !Number.isFinite(value) || value < 0) {
      throw new Error('Nếu nhập dinh dưỡng, hãy nhập đủ 4 giá trị không âm cho mỗi phần.');
    }
    return [key, value];
  })) : null;
  return {
    name, description: String(raw.description ?? '').trim(), servings, ingredients, steps,
    tags: Array.isArray(raw.tags) ? structuredClone(raw.tags) : String(raw.tags ?? '').split(',').map(tag => tag.trim()).filter(Boolean),
    notes: String(raw.notes ?? '').trim(), nutritionPerServing
  };
}

export function recipeTotals(recipe) {
  if (!recipe.nutritionPerServing) return null;
  return Object.fromEntries(Object.entries(recipe.nutritionPerServing).map(([key, value]) => [key, value * recipe.servings]));
}

export function scaleRecipe(recipe, targetServings) {
  const servings = Number(targetServings);
  if (targetServings === null || targetServings === undefined || String(targetServings).trim() === '' || !Number.isFinite(servings) || servings <= 0 || servings > 100) {
    throw new Error('Nhập số phần định nấu lớn hơn 0 và không quá 100.');
  }
  if (!Number.isFinite(recipe.servings) || recipe.servings <= 0) throw new Error('Số phần gốc không hợp lệ.');
  const preview = structuredClone(recipe);
  preview.servings = servings;
  preview.ingredients = recipe.ingredients.map(item => {
    const quantity = item.quantity * (servings / recipe.servings);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Lượng nguyên liệu sau khi đổi số phần không hợp lệ.');
    return { ...item, quantity };
  });
  return preview;
}
