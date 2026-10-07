import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { emptyData, createBackup } from '../js/data.js';

// Run the app's actual export handler with controlled browser capabilities.
// This proves URL lifecycle/error behavior, not a saved browser download.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('function exportData()'), source.indexOf('\ntry { data = loadData(localStorage); }'));
const photoHandler = source.slice(source.indexOf('async function exportPhotos()'), source.indexOf('\nasync function previewPhotoRestore('));
const copyHandler = source.slice(source.indexOf('async function copyData()'), source.indexOf('\nfunction exportData()'));
function harness(failure) {
  const revoked = [], links = [], messages = [], handlers = [];
  const env = { Blob, localStorage: {}, backupUrl: 'blob:old',
    loadData() { if (failure === 'storage') throw Error('storage denied'); return emptyData(); },
    createBackup() { if (failure === 'validation') throw Error('invalid data'); return createBackup(emptyData()); },
    URL: { revokeObjectURL: url => revoked.push(url), createObjectURL() { if (failure === 'url') throw Error('URL unavailable'); return 'blob:new'; } },
    localDate: () => '2026-10-08',
    node: (_, attributes) => ({ ...attributes, addEventListener: (_, callback) => handlers.push(callback) }),
    document: { querySelector: () => ({ replaceChildren: link => links.push(link) }) },
    setBackupStatus: (_, text) => messages.push(text), message: text => messages.push(text)
  };
  vm.runInNewContext(handler + '\nexportData();', env);
  return { env, revoked, links, messages, handlers };
}
for (const failure of ['storage', 'validation', 'url']) {
  test(`failed JSON export (${failure}) preserves the previously prepared URL`, () => {
    const result = harness(failure);
    assert.deepEqual(result.revoked, []);
    assert.equal(result.env.backupUrl, 'blob:old');
    assert.equal(result.links.length, 0);
    assert.ok(result.messages.some(text => text.includes('Không thể xuất')));
  });
}
test('successful JSON export replaces and revokes the old URL but never claims a completed download', () => {
  const result = harness();
  assert.deepEqual(result.revoked, ['blob:old']);
  assert.equal(result.env.backupUrl, 'blob:new');
  assert.equal(result.links[0].href, 'blob:new');
  assert.equal(result.links[0].download, 'tracker-backup-2026-10-08.json');
  assert.ok(result.messages.some(text => text.includes('chưa xác nhận tải về')));
  result.handlers[0]();
  assert.ok(result.messages.some(text => text.includes('yêu cầu trình duyệt')));
});

async function photoHarness(failure) {
  const revoked = [], links = [], messages = [];
  const env = { Blob, photoBackupUrl: 'blob:old-photo',
    async listPhotos() { if (failure === 'read') throw Error('storage denied'); return []; },
    async createPhotoBackup() { if (failure === 'encode') throw Error('invalid photo'); return '{"photos":[]}'; },
    URL: { revokeObjectURL: url => revoked.push(url), createObjectURL() { if (failure === 'url') throw Error('URL unavailable'); return 'blob:new-photo'; } },
    localDate: () => '2026-10-08',
    node: (_, attributes) => ({ ...attributes, addEventListener() {} }), button: text => ({ text }),
    document: { querySelector: () => ({ replaceChildren: link => links.push(link) }) },
    setBackupStatus: (_, text) => messages.push(text), message: text => messages.push(text)
  };
  await vm.runInNewContext(photoHandler + '\nexportPhotos();', env);
  return { env, revoked, links, messages };
}
for (const failure of ['read', 'encode', 'url']) {
  test(`failed photo export (${failure}) preserves the previously prepared URL`, async () => {
    const result = await photoHarness(failure);
    assert.deepEqual(result.revoked, []);
    assert.equal(result.env.photoBackupUrl, 'blob:old-photo');
    assert.equal(result.links.length, 0);
    assert.ok(result.messages.some(text => text.includes('Không chuẩn bị được')));
  });
}
test('successful empty photo export replaces the old URL and marks only file preparation', async () => {
  const result = await photoHarness();
  assert.deepEqual(result.revoked, ['blob:old-photo']);
  assert.equal(result.links[0].href, 'blob:new-photo');
  assert.equal(result.links[0].download, 'tracker-photos-2026-10-08.json');
  assert.ok(result.messages.some(text => text.includes('0 ảnh. Chưa xác nhận tải về')));
});
for (const mode of ['absent', 'denied', 'available']) {
  test(`JSON clipboard ${mode} reports its actual result and leaves download available`, async () => {
    const messages = [], copied = [];
    const env = { localStorage: {}, loadData: () => emptyData(), createBackup,
      navigator: { clipboard: mode === 'absent' ? undefined : { async writeText(text) { if (mode === 'denied') throw Error('denied'); copied.push(text); } } },
      message: text => messages.push(text)
    };
    await vm.runInNewContext(copyHandler + '\ncopyData();', env);
    if (mode === 'available') {
      assert.equal(JSON.parse(copied[0]).schemaVersion, 8);
      assert.match(messages[0], /Đã sao chép/);
    } else {
      assert.deepEqual(copied, []);
      assert.match(messages[0], /Hãy dùng liên kết tải file/);
    }
  });
}
