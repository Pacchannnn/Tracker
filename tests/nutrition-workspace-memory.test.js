import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';
import { createNutritionBatchUI } from '../js/nutrition-batch-ui.js';
import { createCookbookUI } from '../js/cookbook-ui.js';
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.parentElement = null; this.attributes = {}; this.dataset = {}; this.listeners = {}; this.value = ''; this._text = ''; this.className = ''; this.classList = { add: (...values) => this.className += ' ' + values.join(' ') }; }
  get isConnected() { return this.root || Boolean(this.parentElement?.isConnected); }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(' '); } set textContent(value) { this._text = String(value); this.children = []; }
  append(...items) { for (const item of items) { item.parentElement = this; this.children.push(item); } }
  prepend(item) { item.parentElement = this; this.children.unshift(item); }
  replaceChildren(...items) { for (const item of this.children) item.parentElement = null; this.children = []; this._text = ''; this.append(...items); }
  setAttribute(key, value) { this.attributes[key] = String(value); } removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type) { return Promise.all((this.listeners[type] || []).map(fn => fn({ preventDefault() {}, target: this }))); }
  querySelectorAll(selector) {
    const parts = selector.split(',').map(value => value.trim()); return descendants(this).filter(el => parts.some(part => {
      const leaf = part.split(' ').at(-1); if (leaf.startsWith('.')) return el.className.split(' ').includes(leaf.slice(1));
      if (leaf.startsWith('[')) { const [key, value] = leaf.slice(1, -1).split('='); return el.attributes[key] !== undefined && (value === undefined || el.attributes[key] === value); }
      return el.tagName === leaf;
    }));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() {} scrollIntoView() {}
}
const descendants = root => root.children.flatMap(child => [child, ...descendants(child)]);
const recipe = name => ({ id: 'r', name, description: '', servings: 2, ingredients: [{ quantity: 2, unit: 'g', name: name + ' ingredient' }], steps: [name + ' step'], tags: [name + ' tag'], notes: name + ' note', nutritionPerServing: null });
function environment() {
  let data = emptyData(); data.foods = [{ id: 'f', name: 'PRIVATE-A food', serving: '1 serving', calories: 100, protein: 2, carbs: 3, fat: 4, notes: '' }]; data.recipes = [recipe('PRIVATE-A recipe')];
  let acceptCount = 0, renders = 0, saved = 0, resolve, reject, deferredChange; const messages = [];
  const node = (tag, options = {}, children = []) => { const el = new Element(tag); for (const [key, value] of Object.entries(options)) { if (key === 'text') el.textContent = value; else if (key === 'class') el.className = value; else if (key === 'value') el.value = value; else if (key === 'onClick') el.addEventListener('click', value); else el.setAttribute(key, value); } el.append(...children); return el; };
  const helpers = { node, button: (label, fn) => node('button', { text: label, onClick: fn }), p: (text, cls) => node('p', { text, class: cls }), h2: text => node('h2', { text }), h3: text => node('h3', { text }), div: (cls, ...items) => node('div', { class: cls }, items), panel: (...items) => node('section', {}, items), field: (label, name, value, options = {}) => node('label', {}, [node('span', { text: label }), node(options.tag || 'input', { name, value })]), fmt: String, id: () => 'new', message: text => messages.push(text) };
  const main = node('main'); main.root = true;
  const options = { main, getData: () => data, getLatest: () => data, write: change => { deferredChange = change; return new Promise((ok, no) => { resolve = ok; reject = no; }); }, acceptData: next => { acceptCount++; data = next; }, render: () => renders++, onSaved: () => saved++, onDuplicateStart() {}, clearPhotoUrls() {}, helpers };
  return { main, options, helpers, current: () => data, switchToB: () => { data = emptyData(); data.foods = [{ id: 'fB', name: 'B food', serving: '1', calories: 1, protein: 1, carbs: 1, fat: 1, notes: '' }]; data.recipes = [recipe('B recipe')]; }, complete: next => resolve(next), fail: () => reject(Error('OLD-A failure')), deferredChange: () => deferredChange, counts: () => ({ acceptCount, renders, saved }), messages };
}
const find = (main, text) => descendants(main).find(el => el.tagName === 'button' && el.textContent === text);
function reviewedBatch(s, ui) {
  ui.render('2026-10-10'); find(s.main, 'Thêm nhiều món').dispatch('click'); s.main.replaceChildren(); ui.render('2026-10-10');
  find(s.main, 'Chọn PRIVATE-A food').dispatch('click'); find(s.main, 'Review batch').dispatch('click'); s.main.replaceChildren(); ui.render('2026-10-10');
}
test('nutrition reset clears A selected/reviewed food before rendering B', () => {
  const s = environment(), ui = createNutritionBatchUI(s.options); reviewedBatch(s, ui); assert.match(s.main.textContent, /PRIVATE-A food/);
  assert.equal(typeof ui.reset, 'function'); ui.reset(); s.switchToB(); s.main.replaceChildren(); ui.render('2026-10-10');
  assert.ok(!s.main.textContent.includes('PRIVATE-A')); assert.ok(find(s.main, 'Thêm nhiều món'));
});
test('nutrition reset ignores delayed A success/failure and guards a deferred write callback', async () => {
  for (const fail of [false, true]) {
    const s = environment(), ui = createNutritionBatchUI(s.options); reviewedBatch(s, ui); const old = structuredClone(s.current()); const pending = find(s.main, 'Thêm 1 món').dispatch('click');
    assert.equal(typeof ui.reset, 'function'); ui.reset(); s.switchToB(); const counts = s.counts();
    assert.throws(() => s.deferredChange()(s.current()), /workspace|không gian/i);
    if (fail) s.fail(); else s.complete(old); await pending; assert.deepEqual(s.counts(), counts); assert.equal(s.current().foods[0].name, 'B food');
  }
});
test('cookbook reset clears A duplicate, cooking and search/tag private memory', async () => {
  const s = environment(), ui = createCookbookUI(s.options), source = s.current().recipes[0]; ui.openDuplicate(source); ui.openCooking(source);
  const box = s.helpers.panel(); s.main.append(box); ui.renderLibrary(box, () => {}); await find(s.main, 'PRIVATE-A recipe tag').dispatch('click'); const search = s.main.querySelector('[name=recipeSearch]'); search.value = 'PRIVATE-A'; await search.dispatch('input');
  assert.equal(typeof ui.reset, 'function'); ui.reset(); s.switchToB(); s.main.replaceChildren(); assert.equal(ui.duplicateDraft(), null); assert.equal(ui.renderCooking(), false);
  const next = s.helpers.panel(); s.main.append(next); ui.renderLibrary(next, () => {}); assert.equal(s.main.querySelector('[name=recipeSearch]').value, ''); assert.ok(!s.main.textContent.includes('PRIVATE-A'));
});
test('cookbook reset ignores delayed duplicate success/failure and old write callback', async () => {
  const originalFormData = globalThis.FormData;
  globalThis.FormData = class { constructor(form) { this.values = descendants(form).filter(el => el.attributes.name).map(el => [el.attributes.name, el.value]); } [Symbol.iterator]() { return this.values[Symbol.iterator](); } };
  try {
    for (const fail of [false, true]) {
      const s = environment(), ui = createCookbookUI(s.options); ui.openDuplicate(s.current().recipes[0]);
      const form = s.helpers.node('form', { class: 'recipe-editor' }); s.main.append(form);
      for (const [name, value] of Object.entries(ui.duplicateDraft().raw)) form.append(s.helpers.node('input', { name, value })); ui.bindDuplicateForm(form);
      const old = structuredClone(s.current()), pending = form.dispatch('submit'); assert.equal(typeof ui.reset, 'function'); ui.reset(); s.switchToB(); const counts = s.counts();
      assert.throws(() => s.deferredChange()(s.current()), /workspace|không gian/i);
      if (fail) s.fail(); else s.complete({ ...old, recipes: [...old.recipes, { ...old.recipes[0], id: 'copy' }] }); await pending;
      assert.deepEqual(s.counts(), counts); assert.equal(s.messages.length, 0); assert.equal(ui.duplicateDraft(), null); assert.equal(s.current().recipes[0].name, 'B recipe');
    }
  } finally { globalThis.FormData = originalFormData; }
});
