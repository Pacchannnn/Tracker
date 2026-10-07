import test from 'node:test';
import assert from 'node:assert/strict';
import { putPhoto, listPhotos } from '../js/photo-store.js';

// Controlled IDBOpenDBRequest event schedules, not a real-browser quota test.
function blockedRequest() {
  let request, closed = 0, aborted = 0, writes = 0;
  globalThis.indexedDB = { open() { request = { result: {
    close() { closed++; }, createObjectStore() { writes++; },
    transaction() { writes++; throw new Error('Unexpected write after blocked open'); }
  }, transaction: { abort() { aborted++; } } }; return request; } };
  return { get request() { return request; }, stats: () => ({ closed, aborted, writes }) };
}

test('blocked photo write rejects promptly and cannot write after late success', async () => {
  const original = globalThis.indexedDB, fixture = blockedRequest();
  try {
    const operation = putPhoto({ id: 'synthetic' });
    fixture.request.onblocked?.();
    const outcome = await Promise.race([operation.then(() => 'resolved', error => error.message),
      new Promise(resolve => setImmediate(() => resolve('pending')))]);
    assert.match(outcome, /tab khác/, 'blocked write must report a recoverable error');
    fixture.request.onupgradeneeded();
    fixture.request.onsuccess();
    assert.deepEqual(fixture.stats(), { closed: 1, aborted: 1, writes: 0 });
  } finally { globalThis.indexedDB = original; }
});

test('blocked photo read closes a late connection without initializing the store', async () => {
  const original = globalThis.indexedDB, fixture = blockedRequest();
  try {
    const operation = listPhotos();
    fixture.request.onblocked();
    await assert.rejects(operation, /tab khác/);
    fixture.request.onsuccess();
    assert.deepEqual(fixture.stats(), { closed: 1, aborted: 0, writes: 0 });
  } finally { globalThis.indexedDB = original; }
});
