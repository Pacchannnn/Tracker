import test from 'node:test';
import assert from 'node:assert/strict';
import { searchFoods } from '../js/nutrition.js';

const food = (id, name, extra = {}) => ({
  id, name, serving: '1 phần', calories: 200, protein: 10, carbs: 30, fat: 5, notes: '', ...extra
});

test('food search matches Vietnamese names with and without composed or decomposed accents', () => {
  const foods = [food('rice', 'Cơm gà'), food('fish', 'Cá hồi')];
  for (const query of ['Cơm gà', 'com ga', 'Cơm gà'.normalize('NFD')]) {
    assert.deepEqual(searchFoods(foods, [], query).map(item => item.id), ['rice']);
  }
});

test('food search ignores upper and lower case', () => {
  const foods = [food('rice', 'Cơm Gà')];
  for (const query of ['CƠM GÀ', 'cơm gà', 'CoM gA']) {
    assert.deepEqual(searchFoods(foods, [], query).map(item => item.id), ['rice']);
  }
});

test('food search treats Vietnamese đ and d alike', () => {
  const foods = [food('bean', 'Đậu đỏ')];
  for (const query of ['ĐẬU ĐỎ', 'đậu đỏ', 'dau do', 'DAU DO']) {
    assert.deepEqual(searchFoods(foods, [], query).map(item => item.id), ['bean']);
  }
});

test('food search trims and collapses whitespace in the query', () => {
  const foods = [food('rice', 'Cơm gà')];
  for (const query of ['  com ga  ', ' com   ga ', '\tCOM\t \nGA\r\n']) {
    assert.deepEqual(searchFoods(foods, [], query).map(item => item.id), ['rice']);
  }
});

test('food search trims and collapses whitespace in the original name', () => {
  const foods = [food('rice', ' \tCơm  \n gà\t ')];
  assert.deepEqual(searchFoods(foods, [], 'com ga').map(item => item.id), ['rice']);
});

test('empty or whitespace-only food search restores the full recent and name ordered library', () => {
  const foods = [food('c', 'C'), food('a', 'A'), food('b', 'B')];
  const entries = [{ foodId: 'c', date: '2026-10-08' }];
  for (const query of ['', '   ', '\t\n']) {
    assert.deepEqual(searchFoods(foods, entries, query).map(item => item.id), ['c', 'a', 'b']);
  }
});

test('food search returns no results for an unmatched query or an empty library', () => {
  assert.deepEqual(searchFoods([food('rice', 'Cơm gà')], [], 'khong-co-mon'), []);
  assert.deepEqual(searchFoods([], [{ foodId: 'deleted', date: '2026-10-08' }], ''), []);
});

test('food search matches names only and does not match notes, serving or IDs', () => {
  const foods = [food('secret-id', 'Cơm gà', { notes: 'Cá hồi', serving: 'Đậu đỏ' })];
  assert.deepEqual(searchFoods(foods, [], 'com').map(item => item.id), ['secret-id']);
  for (const query of ['ca hoi', 'dau do', 'secret-id']) assert.deepEqual(searchFoods(foods, [], query), []);
});

test('food search keeps latest use first and original name ordering for ties and unused foods', () => {
  const foods = [food('d', 'Đậu D'), food('c', 'Đậu C'), food('b', 'Đậu B'), food('a', 'Đậu A'), food('e', 'Đậu E')];
  const entries = [
    { foodId: 'b', date: '2026-10-01' },
    { foodId: 'a', date: '2026-10-07' },
    { foodId: 'c', date: '2026-10-08' },
    { foodId: 'b', date: '2026-10-08' },
    { foodId: 'deleted', date: '2026-10-09' }
  ];
  assert.deepEqual(searchFoods(foods, entries, 'dau').map(item => item.id), ['b', 'c', 'a', 'd', 'e']);
});

test('food search covers every current library item without a recent-food or page limit', () => {
  const foods = Array.from({ length: 73 }, (_, index) => food(`f${index}`, `Đậu ${String(index).padStart(2, '0')}`));
  const results = searchFoods(foods, [{ foodId: 'f72', date: '2026-10-08' }], 'dau');
  assert.equal(results.length, 73);
  assert.equal(new Set(results.map(item => item.id)).size, 73);
  assert.equal(results[0].id, 'f72');
  assert.equal(results[1].id, 'f0');
  assert.equal(results.at(-1).id, 'f71');
  assert.deepEqual(searchFoods(foods, [], 'dau 72').map(item => item.id), ['f72']);
});

test('food search preserves source food references, macros, IDs and historical snapshots without mutation', () => {
  const foods = Object.freeze([
    Object.freeze(food('rice', 'Cơm gà')),
    Object.freeze(food('bean', 'Đậu đỏ', { calories: 150, protein: 8, carbs: 25, fat: 2 }))
  ]);
  const entries = Object.freeze([Object.freeze({
    id: 'entry-old', foodId: 'bean', date: '2026-10-08', meal: 'Lunch', servings: 2,
    food: Object.freeze({ name: 'Đậu đỏ cũ', serving: '100 g', calories: 100, protein: 6, carbs: 15, fat: 1 })
  })]);
  const before = structuredClone({ foods, entries });
  const all = searchFoods(foods, entries, '');
  const matches = searchFoods(foods, entries, ' DAU   DO ');
  assert.notEqual(all, foods);
  assert.equal(all[0], foods[1]);
  assert.equal(all[1], foods[0]);
  assert.equal(matches[0], foods[1]);
  assert.deepEqual({ foods, entries }, before);
});
