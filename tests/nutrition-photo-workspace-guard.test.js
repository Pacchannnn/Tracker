import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createNutritionPhotos } from '../js/nutrition-photo-ui.js';
import { putPhoto, listPhotos } from '../js/photo-store.js';
class Element {
  constructor(tag, text = '') { this.tag = tag; this.textContent = text; this.children = []; this.listeners = {}; this.isConnected = true; }
  append(...children) { this.children.push(...children); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
}
const all = root => [root, ...root.children.flatMap(all)];
const turn = () => new Promise(resolve => setImmediate(resolve));
const image = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
const record = { id: 'old', date: '2026-09-30', category: 'food', ownerType: 'food', ownerId: 'f', blob: image, thumbnail: image, createdAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:00:00Z' };
function setup() {
  let epoch = 1, accept = null, renders = 0; const messages = [], urls = [];
  const node = (tag, options = {}) => new Element(tag, options.text || '');
  const helpers = { node, button: (label, fn) => { const e = node('button', { text: label }); e.addEventListener('click', fn); return e; }, div: () => node('div'), p: text => node('p', { text }), id: () => 'new', message: text => messages.push(text), confirmAction: (text, callback) => accept = callback };
  const card = createNutritionPhotos({ helpers, render: () => renders++, registerUrl: url => urls.push(url), ownerExists: () => true, captureGuard: () => { const expected = epoch; return () => { if (epoch !== expected) throw Error('stale_workspace'); }; } })('food', 'f', 'Food');
  return { card, messages, switchAccount: () => epoch++, accept: () => accept(), renders: () => renders, urls };
}
test('nutrition photo deletion confirmation from an old workspace cannot delete anonymous photos', async () => {
  globalThis.indexedDB = new IDBFactory(); await putPhoto(record); const s = setup();
  for (let i = 0; i < 15 && !all(s.card).some(e => e.textContent === 'Gỡ ảnh'); i++) await turn();
  const remove = all(s.card).find(e => e.textContent === 'Gỡ ảnh'); assert.ok(remove); remove.listeners.click(); s.switchAccount(); await s.accept();
  assert.deepEqual((await listPhotos()).map(item => item.id), ['old']); assert.equal(s.renders(), 0); assert.ok(s.messages.includes('stale_workspace'));
  s.urls.forEach(url => URL.revokeObjectURL(url));
});
test('upload finishing compression after an account switch preserves existing food photos', async () => {
  globalThis.indexedDB = new IDBFactory(); await putPhoto(record); const s = setup();
  const oldBitmap = globalThis.createImageBitmap, oldDocument = globalThis.document;
  let finish;
  globalThis.createImageBitmap = () => new Promise(resolve => finish = resolve);
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: callback => callback(image) }) };
  try {
    const input = all(s.card).find(e => e.tag === 'input'); input.files = [image];
    const uploading = input.listeners.change(); s.switchAccount(); finish({ width: 10, height: 10, close() {} }); await uploading;
    assert.deepEqual((await listPhotos()).map(item => item.id), ['old']); assert.equal(s.renders(), 0); assert.ok(s.messages.includes('stale_workspace'));
  } finally { globalThis.createImageBitmap = oldBitmap; globalThis.document = oldDocument; s.urls.forEach(url => URL.revokeObjectURL(url)); }
});
