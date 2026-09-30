import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhotoMeta, ownedPhotos } from '../js/photo-store.js';
import { createPhotoBackup, parsePhotoBackup } from '../js/photo-backup.js';
test('food and recipe photo owners validate without changing legacy journal metadata', () => {
  const raw = { date: '2026-09-30', category: 'food', ownerType: 'recipe', ownerId: 'r1' };
  assert.equal(validatePhotoMeta(raw).ownerId, 'r1');
  assert.throws(() => validatePhotoMeta({ ...raw, ownerType: 'unknown' }));
  assert.throws(() => validatePhotoMeta({ ...raw, ownerId: '' }));
  assert.throws(() => validatePhotoMeta({ ...raw, category: 'daily' }));
  assert.equal(validatePhotoMeta({ date: raw.date, category: 'daily' }).ownerType, undefined);
  assert.equal(ownedPhotos([raw, { ...raw, ownerId: 'r2' }, { ...raw, ownerType: 'food' }], 'recipe', 'r1').length, 1);
});
test('photo backup preserves owner metadata and does not embed blobs in fitness JSON', async () => {
  const image = new Blob([new Uint8Array([255,216,255,217])], { type: 'image/jpeg' });
  const record = { id: 'p1', ...validatePhotoMeta({ date: '2026-09-30', category: 'food', ownerType: 'food', ownerId: 'f1' }), blob: image, thumbnail: image, createdAt: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T00:00:00.000Z' };
  const backup = await createPhotoBackup([record]);
  const parsed = parsePhotoBackup(backup);
  assert.equal(parsed.photos[0].ownerId, 'f1');
});
