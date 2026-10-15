import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {readAssets,audit,publicConfig,checkOutputNames,noLinks} from './static-package.js';
import {previewOrigin} from '../cloud/vercel.js';

// Runs in the staged artifact. Only the five reviewed public config fields may
// reach frontend assets. Database/Auth secrets remain in the function process.
try {
  const env=process.env,root=resolve(process.cwd()),publicRoot=join(root,'public');
  if(env.NODEJS_HELPERS!=='0' || env.VERCEL_ENV && env.VERCEL_ENV!=='preview')throw Error('invalid_preview_build');
  const flag=env.TRACKER_PUBLIC_CLOUD_ENABLED || 'false';
  if(!['true','false'].includes(flag))throw Error('invalid_public_cloud_flag');
  let generated=null;
  if(flag==='true') {
    const canonicalOrigin=previewOrigin(env);
    const gatewayUrl=env.TRACKER_ALLOWED_ORIGIN || canonicalOrigin;
    if(env.TRACKER_PUBLIC_ENVIRONMENT && env.TRACKER_PUBLIC_ENVIRONMENT!=='preview' || env.TRACKER_PUBLIC_GATEWAY_URL && env.TRACKER_PUBLIC_GATEWAY_URL!==gatewayUrl)throw Error('invalid_public_preview_config');
    generated=publicConfig({TRACKER_PUBLIC_CLOUD_ENABLED:'true',TRACKER_PUBLIC_ENVIRONMENT:'preview',TRACKER_PUBLIC_SUPABASE_URL:env.TRACKER_PUBLIC_SUPABASE_URL,TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY:env.TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY,TRACKER_PUBLIC_GATEWAY_URL:gatewayUrl});
  }
  checkOutputNames(publicRoot);const assets=readAssets(publicRoot);audit(assets,generated);
  if(generated) {
    assets.set('js/cloud-config.js',generated);audit(assets,generated);
    noLinks(root,'public/js/cloud-config.js');writeFileSync(join(publicRoot,'js/cloud-config.js'),generated);
    if(!readFileSync(join(publicRoot,'js/cloud-config.js')).equals(generated))throw Error('config_integrity_failed');
  }
  console.log(`PASS: 57 approved public assets; preview cloud ${generated?'enabled':'disabled'}; values redacted.`);
} catch {console.error('Preview build rejected: invalid configuration or public assets; values redacted.');process.exitCode=1;}
