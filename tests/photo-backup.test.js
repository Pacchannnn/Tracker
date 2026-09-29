import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePhotoBackup, photoBackupSummary, createPhotoBackup } from '../js/photo-backup.js';

const image = 'data:image/jpeg;base64,/9j/2Q==';
const valid = { format: 'tracker-photo-backup', version: 1, exportedAt: '2026-09-30T00:00:00.000Z', photos: [{ id: 'abc', date: '2026-09-30', category: 'progress', pose: 'front', weight: 70, waist: null, note: '', createdAt: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T00:00:00.000Z', blob: image, thumbnail: image }] };

test('photo backup validates shape and previews count before import', () => {
  assert.equal(parsePhotoBackup(JSON.stringify(valid)).photos.length, 1);
  assert.deepEqual(photoBackupSummary(valid.photos), { count: 1, bytes: 8 });
  assert.throws(() => parsePhotoBackup(JSON.stringify({ ...valid, version: 9 })));
  assert.throws(() => parsePhotoBackup(JSON.stringify({ ...valid, photos: [valid.photos[0], valid.photos[0]] })));
  assert.throws(() => parsePhotoBackup(JSON.stringify({ ...valid, photos: [{ ...valid.photos[0], date: '2026-02-30' }] })));
  assert.throws(() => parsePhotoBackup(JSON.stringify({ ...valid, photos: [{ ...valid.photos[0], blob: 'data:text/html;base64,PGgxPg==' }] })));
});

test('photo backup round trips JPEG blobs and keeps metadata', async () => {
  const decoded = parsePhotoBackup(JSON.stringify(valid));
  const packed = await createPhotoBackup(decoded.photos);
  const restored = parsePhotoBackup(packed);
  assert.equal(restored.photos[0].category, 'progress');
  assert.equal(restored.photos[0].weight, 70);
  assert.equal(restored.photos[0].blob.type, 'image/jpeg');
  assert.equal(restored.photos[0].blob.size, 4);
});
