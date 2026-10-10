import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { emptyData, createBackup } from '../js/data.js';

// Run the app's actual export handler with controlled browser capabilities.
// This proves URL lifecycle/error behavior, not a saved browser download.
const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('function exportData()'), source.indexOf('\ntry { data = readData(); }'));
const photoHandler = source.slice(source.indexOf('async function exportPhotos()'), source.indexOf('\nasync function previewPhotoRestore('));
const copyHandler = source.slice(source.indexOf('async function copyData()'), source.indexOf('\nfunction exportData()'));
const readHandler = source.slice(source.indexOf('function readData()'), source.indexOf('\nasync function writeData('));
const guardHandler = source.slice(source.indexOf('function localWorkspaceGuard()'), source.indexOf('\nconst drafts ='));
function harness(failure, { workspaceState = { mode: 'local', epoch: 0 }, accountData = emptyData() } = {}) {
  const revoked = [], links = [], messages = [], handlers = [], blobs = [];
  const env = { Blob, localStorage: {}, backupUrl: 'blob:old',
    cloudWorkspace: { read: () => workspaceState, getData: () => accountData },
    loadData() { if (failure === 'storage') throw Error('storage denied'); return emptyData(); },
    createBackup(data) { if (failure === 'validation') throw Error('invalid data'); return createBackup(data); },
    URL: { revokeObjectURL: url => revoked.push(url), createObjectURL(blob) { if (failure === 'url') throw Error('URL unavailable'); blobs.push(blob); return 'blob:new'; } },
    localDate: () => '2026-10-08',
    node: (_, attributes) => ({ ...attributes, addEventListener: (_, callback) => handlers.push(callback) }),
    document: { querySelector: () => ({ replaceChildren: link => links.push(link) }) },
    setBackupStatus: (_, text) => messages.push(text), message: text => messages.push(text)
  };
  vm.runInNewContext(readHandler + '\n' + handler + '\nexportData();', env);
  return { env, revoked, links, messages, handlers, blobs };
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

async function photoHarness(failure, { workspaceState = { mode: 'local', epoch: 0 }, encode } = {}) {
  const revoked = [], links = [], messages = [], blobs = [];
  const env = { Blob, photoBackupUrl: 'blob:old-photo',
    cloudWorkspace: { read: () => workspaceState },
    async listPhotos() { if (failure === 'read') throw Error('storage denied'); return []; },
    async createPhotoBackup() { if (failure === 'encode') throw Error('invalid photo'); return encode ? encode() : '{"photos":[]}'; },
    URL: { revokeObjectURL: url => revoked.push(url), createObjectURL(blob) { if (failure === 'url') throw Error('URL unavailable'); blobs.push(blob); return 'blob:new-photo'; } },
    localDate: () => '2026-10-08',
    node: (_, attributes) => ({ ...attributes, addEventListener() {} }), button: text => ({ text }),
    document: { querySelector: () => ({ replaceChildren: link => links.push(link) }) },
    setBackupStatus: (_, text) => messages.push(text), message: text => messages.push(text)
  };
  await vm.runInNewContext(guardHandler + '\n' + photoHandler + '\nexportPhotos();', env);
  return { env, revoked, links, messages, blobs };
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
    const env = { localStorage: {}, loadData: () => emptyData(), createBackup, cloudWorkspace: { read: () => ({ mode: 'local', epoch: 0 }) },
      navigator: { clipboard: mode === 'absent' ? undefined : { async writeText(text) { if (mode === 'denied') throw Error('denied'); copied.push(text); } } },
      message: text => messages.push(text)
    };
    await vm.runInNewContext(readHandler + '\n' + copyHandler + '\ncopyData();', env);
    if (mode === 'available') {
      assert.equal(JSON.parse(copied[0]).schemaVersion, 8);
      assert.match(messages[0], /Đã sao chép/);
    } else {
      assert.deepEqual(copied, []);
      assert.match(messages[0], /Hãy dùng liên kết tải file/);
    }
  });
}
test('account JSON export reads selected account projection and never falls back to anonymous storage', async () => {
  const accountData = emptyData(); accountData.settings.week = 6;
  accountData.foods.push({ id: 'account-food', name: 'Synthetic account food', serving: 'portion', calories: 100, protein: 2, carbs: 20, fat: 1, notes: '' });
  const result = harness('storage', { workspaceState: { mode: 'account', epoch: 1 }, accountData });
  assert.equal(result.blobs.length, 1); const backup = JSON.parse(await result.blobs[0].text());
  assert.equal(backup.data.settings.week, 6); assert.equal(backup.data.foods[0].id, 'account-food'); assert.equal(result.links[0].href, 'blob:new');
  assert.ok(!result.messages.some(text => text.includes('Không thể xuất')));
});
test('deferred photo export after workspace switch preserves existing URL and creates no new account link', async () => {
  let finishEncoding, encodingStarted;
  const started = new Promise(resolve => { encodingStarted = resolve; }), encoded = new Promise(resolve => { finishEncoding = resolve; });
  const workspaceState = { mode: 'local', epoch: 1 };
  const pending = photoHarness(undefined, { workspaceState, encode: () => { encodingStarted(); return encoded; } });
  await started; workspaceState.mode = 'account'; workspaceState.epoch = 2; finishEncoding('{"photos":[]}');
  const result = await pending;
  assert.deepEqual(result.revoked, []); assert.equal(result.env.photoBackupUrl, 'blob:old-photo'); assert.deepEqual(result.blobs, []); assert.deepEqual(result.links, []);
  assert.ok(result.messages.some(text => text.includes('Không chuẩn bị được'))); assert.ok(!result.messages.some(text => text.includes('Đã chuẩn bị file')));
});
