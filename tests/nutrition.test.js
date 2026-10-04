import test from 'node:test';
import assert from 'node:assert/strict';
import { recentFoods, copyDayEntries, savedMealFromEntries, useSavedMeal, validateRecipe, recipeTotals } from '../js/nutrition.js';
import * as nutrition from '../js/nutrition.js';

const food = { name: 'Cơm', serving: '1 bát', calories: 200, protein: 5, carbs: 40, fat: 1 };
const entries = [{ id: 'old', date: '2026-09-29', meal: 'Lunch', foodId: 'f1', food, servings: 1 }];

test('recent foods follow last logged date without changing the food library', () => {
  const foods = [{ id: 'f2', name: 'B' }, { id: 'f1', name: 'A' }];
  assert.deepEqual(recentFoods(foods, entries).map(item => item.id), ['f1', 'f2']);
});

test('copying yesterday preserves logged macros and assigns fresh ids', () => {
  const copied = copyDayEntries(entries, '2026-09-29', '2026-09-30', () => 'new');
  assert.equal(copied[0].id, 'new');
  assert.equal(copied[0].date, '2026-09-30');
  assert.notEqual(copied[0].food, entries[0].food);
  assert.equal(copied[0].food.calories, 200);
  assert.throws(() => copyDayEntries(entries, '2026-09-28', '2026-09-30', () => 'new'));
});

test('saved meal templates create independent historical entries', () => {
  const template = savedMealFromEntries('Cơm trưa', entries, '2026-09-29', 'Lunch', () => 'meal-1');
  const day = useSavedMeal(template, '2026-09-30', 'Dinner', () => 'new');
  assert.equal(day[0].food.calories, 200);
  template.items[0].food.calories = 300;
  assert.equal(day[0].food.calories, 200);
  assert.equal(day[0].meal, 'Dinner');
});

test('recipe keeps structured ingredients and only user supplied macros', () => {
  const recipe = validateRecipe({ name: 'Cơm gà', description: '', servings: '2', ingredients: '200 | g | Gạo\n300 | g | Gà', steps: 'Nấu gạo\nNấu gà', tags: 'Bữa chính', notes: '', calories: '', protein: '', carbs: '', fat: '' });
  assert.equal(recipe.ingredients[0].quantity, 200);
  assert.equal(recipe.ingredients[0].unit, 'g');
  assert.equal(recipe.nutritionPerServing, null);
  assert.equal(recipeTotals(recipe), null);
  const known = validateRecipe({ ...recipe, ingredients: '200 | g | Gạo', steps: 'Nấu', calories: '400', protein: '30', carbs: '50', fat: '10' });
  assert.equal(recipeTotals(known).calories, 800);
  assert.throws(() => validateRecipe({ ...recipe, ingredients: 'gạo không có lượng', steps: 'Nấu' }));
  assert.throws(() => validateRecipe({ ...recipe, ingredients: '200 | g | Gạo', steps: 'Nấu', calories: '400' }));
});

test('daily food search matches Vietnamese without accents and keeps recent ordering without mutation', () => {
  const foods = [{ id: 'a', name: 'Đậu đỏ' }, { id: 'b', name: 'Đậu xanh' }, { id: 'c', name: 'Cơm' }];
  const history = [{ foodId: 'b', date: '2026-10-03' }];
  const before = structuredClone(foods);
  assert.deepEqual(nutrition.searchFoods(foods, history, '  DAU  ').map(item => item.id), ['b', 'a']);
  assert.deepEqual(nutrition.searchFoods(foods, history, 'co\u031bm').map(item => item.id), ['c']);
  assert.deepEqual(nutrition.searchFoods(foods, history, 'absent'), []);
  assert.equal(nutrition.searchFoods(foods, history, '')[0].id, 'b');
  assert.deepEqual(foods, before);
});

test('cook-size preview scales from original quantities while preserving portion nutrition and old logs', () => {
  const recipe = { id: 'r1', name: 'Test', servings: 4, ingredients: [{ quantity: 400, unit: 'g', name: 'Ingredient' }], steps: ['Cook 20 minutes'], nutritionPerServing: { calories: 300, protein: 20, carbs: 40, fat: 8 } };
  const original = structuredClone(recipe);
  const oldEntry = { food: structuredClone(recipe.nutritionPerServing), servings: 1.5 };
  const preview = nutrition.scaleRecipe(recipe, 2);
  assert.equal(preview.ingredients[0].quantity, 200);
  assert.equal(preview.servings, 2);
  assert.deepEqual(recipeTotals(preview), { calories: 600, protein: 40, carbs: 80, fat: 16 });
  assert.equal(preview.nutritionPerServing.calories, 300);
  assert.equal(nutrition.scaleRecipe(recipe, 1.5).ingredients[0].quantity, 150);
  assert.equal(nutrition.scaleRecipe(recipe, 8).ingredients[0].quantity, 800);
  assert.deepEqual(preview.steps, ['Cook 20 minutes']);
  preview.nutritionPerServing.calories = 999;
  preview.ingredients[0].quantity = 999;
  assert.deepEqual(recipe, original);
  assert.equal(oldEntry.food.calories * oldEntry.servings, 450);
});

test('cook-size preview keeps unknown nutrition unknown and rejects invalid amounts', () => {
  const recipe = { servings: 4, ingredients: [{ quantity: 0.25, unit: 'g', name: 'Spice' }], nutritionPerServing: null };
  const preview = nutrition.scaleRecipe(recipe, 0.5);
  assert.equal(preview.ingredients[0].quantity, 0.03125);
  assert.equal(recipeTotals(preview), null);
  for (const value of ['', ' ', null, undefined, 0, -1, NaN, Infinity, 101, 'bad']) assert.throws(() => nutrition.scaleRecipe(recipe, value));
  assert.throws(() => nutrition.scaleRecipe({ ...recipe, servings: 0 }, 2));
  assert.throws(() => nutrition.scaleRecipe({ ...recipe, ingredients: [{ quantity: Number.MAX_VALUE, unit: 'g', name: 'Too big' }] }, 100));
});
