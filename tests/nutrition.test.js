import test from 'node:test';
import assert from 'node:assert/strict';
import { recentFoods, copyDayEntries, savedMealFromEntries, useSavedMeal, validateRecipe, recipeTotals } from '../js/nutrition.js';

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
