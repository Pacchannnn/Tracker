// Remains disabled until an approved project, environment and public key are reviewed.
// Only a Supabase publishable public key belongs here; privileged keys stay server-side.
export const CLOUD_AUTH_CONFIG = Object.freeze({
  enabled: false,
  environment: 'preview',
  projectUrl: '',
  publishableKey: '',
  gatewayUrl: ''
});
