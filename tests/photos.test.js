import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhotoMeta, validatePhotoFile, PHOTO_CATEGORIES } from '../js/photo-store.js';

test('photo metadata keeps progress measurements optional and validates categories', () => {
  const meta = validatePhotoMeta({ date: '2026-09-30', category: 'progress', pose: 'front', weight: '70.5', waist: '', note: 'So sánh sau này' });
  assert.deepEqual(meta, { date: '2026-09-30', category: 'progress', pose: 'front', weight: 70.5, waist: null, note: 'So sánh sau này' });
  assert.equal(PHOTO_CATEGORIES.length, 5);
  assert.throws(() => validatePhotoMeta({ date: '2026-02-30', category: 'daily' }));
  assert.throws(() => validatePhotoMeta({ date: '2026-09-30', category: 'public' }));
  assert.throws(() => validatePhotoMeta({ date: '2026-09-30', category: 'progress', pose: 'unknown' }));
});

test('photo file accepts only supported images within the size limit', () => {
  assert.doesNotThrow(() => validatePhotoFile({ type: 'image/jpeg', size: 1000 }));
  assert.throws(() => validatePhotoFile({ type: 'image/svg+xml', size: 1000 }));
  assert.throws(() => validatePhotoFile({ type: 'image/png', size: 21_000_000 }));
});
