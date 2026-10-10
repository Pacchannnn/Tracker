import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, appendFileSync, symlinkSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = resolve(import.meta.dirname, '..');
const cli = join(repo, 'scripts/static-package.js');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'tracker-package-'));
  t.after(() => { assert.ok(root.startsWith(join(tmpdir(), 'tracker-package-'))); rmSync(root, { recursive: true, force: true }); });
  for (const path of ['index.html', 'css/style.css', 'assets/fonts/PatrickHand-Regular.ttf', 'assets/fonts/OFL.txt', ...readdirSync(join(repo, 'js')).map(name => `js/${name}`)]) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    copyFileSync(join(repo, path), join(root, path));
  }
  if (existsSync(join(repo, 'vercel.json'))) copyFileSync(join(repo, 'vercel.json'), join(root, 'vercel.json'));
  return root;
}
function run(root, ...args) { return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' }); }
function files(root) { return readdirSync(root, { recursive: true, withFileTypes: true }).filter(x => x.isFile()).map(x => relative(root, join(x.parentPath, x.name)).replaceAll('\\', '/')).sort(); }

test('package excludes private, development and unapproved same-extension files', t => {
  const root = fixture(t);
  for (const path of ['MASTER_PLAN.md', '.env', 'tracker-backup-private.json', '.local/personal.jpg', 'tests/test.js', 'node_modules/private.js', 'js/private.js', 'css/private.css', 'cloud/server.js', 'cloud/migrations/001_foundation.sql', 'cloud/package-lock.json']) {
    mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), 'PRIVATE SYNTHETIC SENTINEL');
  }
  const result = run(root); assert.equal(result.status, 0, result.stderr);
  const output = files(join(root, 'dist')); assert.equal(output.length, 48);
  for (const path of ['js/cloud-auth.js', 'js/cloud-auth-ui.js', 'js/cloud-config.js']) assert.ok(output.includes(path));
  for (const path of ['js/cloud-store.js','js/cloud-records.js','js/cloud-sync.js','js/cloud-workspace.js','js/cloud-workspace-ui.js','js/cloud-import-preview.js']) assert.ok(output.includes(path));
  assert.ok(!output.some(path => path.startsWith('cloud/')));
  assert.ok(output.includes('js/app.js')); assert.ok(output.includes('assets/fonts/OFL.txt'));
  assert.ok(!output.some(path => /private|MASTER|\.env|node_modules|tests|\.local/.test(path)));
  for (const path of output) assert.deepEqual(readFileSync(join(root, 'dist', path)), readFileSync(join(root, path)));
});
test('repeated package and check preserve identical bytes and deterministic inventory', t => {
  const root = fixture(t); assert.equal(run(root).status, 0);
  const first = run(root, '--inventory'); assert.equal(first.status, 0, first.stderr);
  assert.equal(run(root).status, 0); assert.equal(run(root, '--inventory').stdout, first.stdout);
  assert.equal(run(root, '--check').status, 0);
});
test('missing runtime file rejects before replacing an existing valid artifact', t => {
  const root = fixture(t); assert.equal(run(root).status, 0);
  const before = readFileSync(join(root, 'dist/index.html'));
  rmSync(join(root, 'assets/fonts/PatrickHand-Regular.ttf'));
  assert.notEqual(run(root).status, 0); assert.deepEqual(readFileSync(join(root, 'dist/index.html')), before);
});
test('unknown existing output is rejected and retained rather than deleted', t => {
  const root = fixture(t); assert.equal(run(root).status, 0);
  writeFileSync(join(root, 'dist/personal.txt'), 'SYNTHETIC PRIVATE');
  assert.notEqual(run(root).status, 0); assert.equal(readFileSync(join(root, 'dist/personal.txt'), 'utf8'), 'SYNTHETIC PRIVATE');
});
test('secret-like source prevents packaging without printing the matching value', t => {
  for (const prefix of ['sk_', 'sk-', 'sk-proj-', 'sb_secret_', 'ghp_', 'github_pat_']) {
    const root = fixture(t), secret = prefix + 'A'.repeat(40);
    appendFileSync(join(root, 'js/app.js'), `\nconst syntheticSecret = '${secret}';`);
    const result = run(root); assert.notEqual(result.status, 0); assert.ok(!existsSync(join(root, 'dist')));
    assert.ok(!`${result.stdout}${result.stderr}`.includes(secret));
  }
});
test('unapproved static imports cannot escape the public asset graph', t => {
  const root = fixture(t); writeFileSync(join(root, 'js/private.js'), 'export const privateValue=1;');
  appendFileSync(join(root, 'js/app.js'), "\nimport './private.js';");
  assert.notEqual(run(root).status, 0); assert.ok(!existsSync(join(root, 'dist')));
});
test('literal dynamic imports load allowed assets; computed dynamic imports reject', t => {
  const root = fixture(t); appendFileSync(join(root, 'js/app.js'), "\nasync function syntheticImport(){return import('./progress.js?v=40');}");
  assert.equal(run(root).status, 0);
  appendFileSync(join(root, 'js/app.js'), '\nfunction unsafeImport(path){return import(path);}');
  assert.notEqual(run(root).status, 0);
});
test('remote CSS resources reject instead of introducing third-party requests', t => {
  const root = fixture(t); appendFileSync(join(root, 'css/style.css'), "\nbody{background:url('https://example.invalid/private.png')}");
  assert.notEqual(run(root).status, 0);
});
test('only reviewed Auth transport is allowed and disabled provider config is enforced', t => {
  for (const path of ['js/app.js', 'js/cloud-auth.js', 'js/cloud-auth-ui.js']) {
    const root = fixture(t); appendFileSync(join(root, path), '\nfetch("/unapproved");');
    assert.notEqual(run(root).status, 0);
  }
  const root = fixture(t); appendFileSync(join(root, 'js/cloud-config.js'), '\nconst key="sb_secret_' + 'A'.repeat(40) + '";');
  assert.notEqual(run(root).status, 0);
  const configured = fixture(t); writeFileSync(join(configured, 'js/cloud-config.js'), "export const CLOUD_AUTH_CONFIG={enabled:true, projectUrl:'', publishableKey:''};");
  assert.notEqual(run(configured).status, 0);
});
test('artifact validation rejects changed, missing and unexpected output files', t => {
  const root = fixture(t); assert.equal(run(root).status, 0);
  appendFileSync(join(root, 'dist/js/app.js'), '\n// changed'); assert.notEqual(run(root, '--check').status, 0);
  assert.equal(run(root).status, 0); rmSync(join(root, 'dist/css/style.css')); assert.notEqual(run(root, '--check').status, 0);
});
test('source directory junctions are not followed outside the input root', t => {
  const root = fixture(t), outside = mkdtempSync(join(tmpdir(), 'tracker-outside-'));
  t.after(() => { assert.ok(outside.startsWith(join(tmpdir(), 'tracker-outside-'))); rmSync(outside, { recursive: true, force: true }); });
  rmSync(join(root, 'js'), { recursive: true }); symlinkSync(outside, join(root, 'js'), 'junction');
  assert.notEqual(run(root).status, 0); assert.ok(!existsSync(join(root, 'dist')));
});
test('unsafe or unrelated Vercel config is blocked before producing the artifact', t => {
  const root = fixture(t); writeFileSync(join(root, 'vercel.json'), JSON.stringify({ outputDirectory: '.', env: { SYNTHETIC: 'not-a-secret' } }));
  assert.notEqual(run(root).status, 0); assert.ok(!existsSync(join(root, 'dist')));
});
test('unknown CLI switches cannot change the output directory', t => {
  const root = fixture(t); assert.notEqual(run(root, '--output=..').status, 0); assert.ok(!existsSync(join(root, 'dist')));
});
test('dangling output junction is rejected without writing to its external target', t => {
  const root = fixture(t), target = join(root, 'external-target');
  symlinkSync(target, join(root, 'dist'), 'junction');
  assert.notEqual(run(root).status, 0); assert.ok(!existsSync(target));
});
test('output hard links cannot overwrite another file while rebuilding', t => {
  const root = fixture(t); assert.equal(run(root).status, 0);
  const protectedFile = join(root, 'protected-synthetic.txt'); writeFileSync(protectedFile, 'SYNTHETIC KEEP');
  rmSync(join(root, 'dist/js/app.js')); linkSync(protectedFile, join(root, 'dist/js/app.js'));
  assert.notEqual(run(root).status, 0); assert.equal(readFileSync(protectedFile, 'utf8'), 'SYNTHETIC KEEP');
});
