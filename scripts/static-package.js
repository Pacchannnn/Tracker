import { lstatSync, readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, posix } from 'node:path';
import { createHash } from 'node:crypto';

// Public runtime allowlist. Adding a file requires review; never copy whole folders.
const ASSETS = [
  'index.html', 'css/style.css', 'assets/fonts/PatrickHand-Regular.ttf', 'assets/fonts/OFL.txt',
  'js/app.js', 'js/cloud-auth.js', 'js/cloud-auth-ui.js', 'js/cloud-config.js', 'js/cloud-store.js', 'js/cloud-records.js', 'js/cloud-sync.js', 'js/cloud-workspace.js', 'js/cloud-workspace-ui.js', 'js/cloud-import-preview.js', 'js/cookbook.js', 'js/cookbook-ui.js', 'js/custom-workout.js', 'js/data.js',
  'js/exercise-picker.js', 'js/exercise-picker-ui.js', 'js/gym-builder-ui.js', 'js/journal.js',
  'js/journal-retrieval-ui.js', 'js/life-review.js', 'js/life-review-ui.js', 'js/life-review-source.js',
  'js/live-workout-ui.js', 'js/month-memories-ui.js', 'js/my-day.js', 'js/my-day-ui.js',
  'js/navigation.js', 'js/nutrition.js', 'js/nutrition-batch.js', 'js/nutrition-batch-ui.js',
  'js/nutrition-photo-ui.js', 'js/photo-backup.js', 'js/photo-store.js', 'js/planner.js',
  'js/planner-ui.js', 'js/planning-draft.js', 'js/program.js', 'js/progress.js',
  'js/session-identity.js', 'js/session-readers.js', 'js/session-runtime.js', 'js/session-structure.js',
  'js/session-ui.js', 'js/workout.js'
].sort();
const allowed = new Set(ASSETS);
const directories = new Set(ASSETS.flatMap(path => path.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));
const root = resolve(process.cwd());
const output = join(root, 'dist');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function noLinks(base, path = '') {
  let current = base;
  if (lstatSync(current).isSymbolicLink()) throw new Error('Symlink input/output root refused.');
  for (const part of path.split('/').filter(Boolean)) {
    current = join(current, part);
    const info = lstatSync(current, { throwIfNoEntry: false });
    if (info?.isSymbolicLink() || (info?.isFile() && info.nlink > 1)) throw new Error(`Linked file/path refused: ${path}`);
  }
}
function readAssets(base) {
  return new Map(ASSETS.map(path => {
    noLinks(base, path);
    if (!lstatSync(join(base, path)).isFile()) throw new Error(`Runtime file required: ${path}`);
    return [path, readFileSync(join(base, path))];
  }));
}
function checkOutputNames(base) {
  noLinks(base);
  function visit(path = '') {
    for (const item of readdirSync(join(base, path), { withFileTypes: true })) {
      const name = path ? `${path}/${item.name}` : item.name;
      noLinks(base, name);
      if (item.isSymbolicLink()) throw new Error(`Symlink refused: ${name}`);
      if (item.isDirectory() && directories.has(name)) visit(name);
      else if (!item.isFile() || !allowed.has(name)) throw new Error(`Unapproved output retained; packaging stopped: ${name}`);
    }
  }
  visit();
}
function reference(from, specifier) {
  // Current runtime uses relative literal paths; reject newly introduced loaders.
  if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(specifier)) throw new Error(`Non-relative resource in ${from}`);
  const url = new URL(specifier, `https://artifact.invalid/${from}`);
  const path = decodeURIComponent(url.pathname.slice(1));
  if (url.origin !== 'https://artifact.invalid' || !allowed.has(path)) throw new Error(`Unapproved resource in ${from}`);
  return path;
}
function publicConfig() {
  const names=['TRACKER_PUBLIC_CLOUD_ENABLED','TRACKER_PUBLIC_ENVIRONMENT','TRACKER_PUBLIC_SUPABASE_URL','TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY','TRACKER_PUBLIC_GATEWAY_URL'];
  const values=names.map(name=>process.env[name] || '');
  if(values.every(value=>!value)) return null;
  const [enabled,environment,projectUrl,publishableKey,gatewayUrl]=values;
  if(enabled!=='true' || environment!=='preview' || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(projectUrl) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey) || !/^https:\/\/[a-z0-9]+(?:[.-][a-z0-9]+)*(?::\d{1,5})?$/i.test(gatewayUrl)) throw new Error('Invalid or incomplete public preview configuration; values redacted.');
  if(new URL(gatewayUrl).origin!==gatewayUrl) throw new Error('Invalid gateway origin; value redacted.');
  return Buffer.from('export const CLOUD_AUTH_CONFIG = Object.freeze('+JSON.stringify({enabled:true,environment,projectUrl,publishableKey,gatewayUrl})+');\n');
}
function audit(assets, generatedConfig = null) {
  const graph = new Map();
  const secrets = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk(?:-proj)?[-_]|sb_secret_|ghp_|github_pat_)[A-Za-z0-9_-]{20,}|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/;
  for (const [path, bytes] of assets) {
    if (!/\.(?:js|html|css|txt)$/.test(path)) continue;
    const text = bytes.toString('utf8');
    if (secrets.test(text)) throw new Error(`Secret-like content in ${path}; matching value redacted.`);
    if(path==='js/cloud-config.js' && generatedConfig && bytes.equals(generatedConfig)) { graph.set(path,[]); continue; }
    // OFL contains attribution URLs as plain text, never loaded by the app.
    if (path === 'assets/fonts/OFL.txt') continue;
    if (/sourceMappingURL|\bFixture\b|phase8Probe|https?:\/\//.test(text)) throw new Error(`Unexpected map, fixture or remote URL in ${path}`);
    // One reviewed native transport in the fixed-project Auth adapter. Do not
    // exempt other network APIs, remote assets, secret scans or other modules.
    let networkText = text;
    if (path === 'js/cloud-auth.js') {
      const transport = 'globalThis.fetch(...args)';
      if (text.split(transport).length !== 2) throw new Error('Auth transport differs from reviewed entry point.');
      networkText = text.replace(transport, 'reviewedAuthTransport');
    }
    if (/\b(?:fetch|WebSocket|EventSource)\s*\(|\.sendBeacon\s*\(/.test(networkText)) throw new Error(`Unexpected network API in ${path}`);
    if (path === 'js/cloud-config.js' && (!/enabled:\s*false/.test(text) || !/projectUrl:\s*''/.test(text) || !/publishableKey:\s*''/.test(text) || !/gatewayUrl:\s*''/.test(text))) throw new Error('Provider activation requires a separately reviewed packaging configuration.');
    let references = [];
    if (path.endsWith('.html')) references = [...text.matchAll(/\b(?:src|href)\s*=\s*(['"])(.*?)\1/g)].map(x => x[2]);
    if (path.endsWith('.css')) {
      references = [...text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)].map(x => x[2]);
      if (/@import\b/.test(text)) throw new Error(`CSS imports require explicit review: ${path}`);
    }
    if (path.endsWith('.js')) {
      references = [...text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?(['"])([^'"]+)\1/g)].map(x => x[2]);
      const dynamic = [...text.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)];
      if ([...text.matchAll(/\bimport\s*\(/g)].length !== dynamic.length) throw new Error(`Computed dynamic import refused: ${path}`);
      references.push(...dynamic.map(x => x[2]));
    }
    graph.set(path, references.map(specifier => reference(path, specifier)));
  }
  const reachable = new Set();
  function visit(path) { if (reachable.has(path)) return; reachable.add(path); for (const dependency of graph.get(path) || []) visit(dependency); }
  visit('index.html');
  for (const path of ASSETS) {
    if (path !== 'assets/fonts/OFL.txt' && !reachable.has(path)) throw new Error(`Unused runtime asset requires review: ${path}`);
  }
}
function checkConfig() {
  noLinks(root, 'vercel.json');
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const expected = {
    buildCommand: 'npm run build', outputDirectory: 'dist', framework: null, installCommand: '',
    headers: [{ source: '/(.*)', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }]
  };
  if (Object.keys(config).sort().join() !== Object.keys(expected).sort().join() ||
      config.buildCommand !== expected.buildCommand || config.outputDirectory !== expected.outputDirectory ||
      config.framework !== null || config.installCommand !== '' || JSON.stringify(config.headers) !== JSON.stringify(expected.headers)) {
    throw new Error('Vercel config differs from reviewed static-only configuration.');
  }
}

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--check', '--inventory'].includes(arg))) throw new Error('Usage: node scripts/static-package.js [--check|--inventory]');
  checkConfig();
  const source = readAssets(root); audit(source);
  const generatedConfig=publicConfig();
  if(generatedConfig) source.set('js/cloud-config.js',generatedConfig);
  audit(source,generatedConfig);
  if (existsSync(output)) checkOutputNames(output);
  if (!args.length) {
    // No recursive deletion. Preflight all sources before touching generated files.
    for (const path of ASSETS) {
      noLinks(root, `dist/${path}`);
      mkdirSync(join(output, posix.dirname(path)), { recursive: true });
      writeFileSync(join(output, path), source.get(path));
    }
  }
  checkOutputNames(output);
  const artifact = readAssets(output); audit(artifact,generatedConfig);
  const inventory = ASSETS.map(path => {
    const bytes = artifact.get(path), sha256 = hash(bytes);
    if (sha256 !== hash(source.get(path))) throw new Error(`Artifact differs from source: ${path}`);
    return { path, bytes: bytes.length, sha256 };
  });
  if (args[0] === '--inventory') console.log(JSON.stringify(inventory, null, 2));
  else console.log(`PASS: ${inventory.length} approved files, ${inventory.reduce((sum, item) => sum + item.bytes, 0)} bytes; graph/privacy/byte-integrity checks passed. Output: dist`);
} catch (error) {
  // Native filesystem errors may include paths, but never read or print secret contents.
  console.error(error.message); process.exitCode = 1;
}
