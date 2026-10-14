import {callPrivateStorage} from './cloud-storage-transport.js?v=44';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailAddress = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const passwordValue = value => typeof value === 'string' && value.length > 0 && value.length <= 4096;
const safeError = () => new Error('Không thể xác thực. Kiểm tra thông tin hoặc thử lại sau.');

// Tokens are held in this adapter's private closure, never in its issued identity.
// REST contracts: github.com/supabase/auth/blob/master/openapi.yaml.
export function createSupabaseAuthAdapter({ config, fetchImpl = (...args) => globalThis.fetch(...args), now = Date.now, pageOrigin = globalThis.location?.origin || '' } = {}) {
  const enabled = config?.enabled === true;
  let origin = '', projectId = '';
  const environment = config?.environment;
  const passwordLoginEnabled = enabled && environment === 'preview';
  const publicKey = config?.publishableKey;
  const gatewayOrigin = config?.gatewayUrl || '';
  if (enabled) {
    const match = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(config.projectUrl || '');
    if (!match || !['preview', 'production'].includes(environment) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey || '')) throw safeError();
    origin = config.projectUrl; projectId = match[1];
  }
  const credentials = new WeakMap();
  async function request(path, { method = 'POST', body, token, signal } = {}) {
    if (!enabled || signal?.aborted) throw safeError();
    const headers = { apikey: publicKey, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const timeout = new AbortController();
    const abort = () => timeout.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const deadline = setTimeout(abort, 15000);
    try {
      const response = await fetchImpl(origin + '/auth/v1' + path, {
        method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: timeout.signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer'
      });
      if (timeout.signal.aborted || !response.ok) throw safeError();
      const result = response.status === 204 ? {} : await response.json();
      if (timeout.signal.aborted) throw safeError();
      return result;
    } catch { throw safeError(); }
    finally { clearTimeout(deadline); signal?.removeEventListener('abort', abort); }
  }
  async function verifySession(session, { email, uid, signal, startedAt }) {
    if (!session || typeof session.access_token !== 'string' || !session.access_token || typeof session.refresh_token !== 'string' || !session.refresh_token
      || session.token_type?.toLowerCase() !== 'bearer' || !Number.isInteger(session.expires_in) || session.expires_in <= 0 || session.expires_in > 604800) throw safeError();
    let expiresAt = startedAt + session.expires_in * 1000;
    if (session.expires_at !== undefined) {
      if (!Number.isSafeInteger(session.expires_at)) throw safeError();
      expiresAt = Math.min(expiresAt, session.expires_at * 1000);
    }
    const user = await request('/user', { method: 'GET', token: session.access_token, signal });
    if (signal?.aborted || expiresAt <= now() || !UUID.test(user?.id || '') || user.role !== 'authenticated' || user.aud !== 'authenticated'
      || !user.email_confirmed_at || user.is_anonymous === true || (uid && user.id !== uid)
      || !emailAddress(user.email) || (email && user.email.toLowerCase() !== email.toLowerCase())) throw safeError();
    const identity = Object.freeze({ uid: user.id, environment, projectId, assurance: 'verified', expiresAt });
    credentials.set(identity, { accessToken: session.access_token, refreshToken: session.refresh_token });
    return identity;
  }
  return Object.freeze({
    kind: 'supabase', enabled, environment, projectId, passwordLoginEnabled,
    isIdentity: identity => credentials.has(identity),
    seal: identity => credentials.delete(identity),
    async beginLogin(email, { signal } = {}) {
      if (!emailAddress(email)) throw safeError();
      await request('/otp', { body: { email, create_user: false }, signal });
    },
    async verifyOtp(email, token, { signal } = {}) {
      if (!emailAddress(email) || !/^\d{6}$/.test(token || '')) throw safeError();
      const startedAt = now();
      const session = await request('/verify', { body: { email, token, type: 'email' }, signal });
      return verifySession(session, { email, signal, startedAt });
    },
    async loginPassword(email, password, { signal } = {}) {
      if (!passwordLoginEnabled || !emailAddress(email) || !passwordValue(password)) throw safeError();
      const startedAt = now();
      const session = await request('/token?grant_type=password', { body: { email, password }, signal });
      return verifySession(session, { email, signal, startedAt });
    },
    async refresh(identity, { signal } = {}) {
      const credential = credentials.get(identity);
      if (!credential || identity.expiresAt <= now()) throw safeError();
      const startedAt = now();
      const session = await request('/token?grant_type=refresh_token', { body: { refresh_token: credential.refreshToken }, signal });
      const next = await verifySession(session, { uid: identity.uid, signal, startedAt });
      credentials.delete(identity); return next;
    },
    async logout(identity) {
      const credential = credentials.get(identity);
      if (!credential) return;
      credentials.delete(identity);
      await request('/logout?scope=local', { token: credential.accessToken });
    },
    async callGateway(identity, route, body, { signal } = {}) {
      const credential = credentials.get(identity);
      if (!credential || identity.expiresAt <= now() || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(gatewayOrigin) || !['push','pull','bootstrap','receipt','pull-v2','bootstrap-v2','photo-prepare','photo-finalize','photo-abandon','photo-download'].includes(route) || signal?.aborted) throw safeError();
      const deadline = new AbortController(), abort = () => deadline.abort();
      signal?.addEventListener('abort', abort, { once:true }); const timer = setTimeout(abort,15000);
      try {
        const response = await fetchImpl(gatewayOrigin + '/' + route, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${credential.accessToken}`}, body:JSON.stringify(body), signal:deadline.signal, credentials:gatewayOrigin === pageOrigin ? 'same-origin' : 'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer' });
        if (deadline.signal.aborted || response.status===401 || response.status>=500) throw safeError();
        const result = await response.json();
        if (deadline.signal.aborted || !result || typeof result!=='object') throw safeError();
        return result;
      } catch { throw safeError(); }
      finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
    },
    callStorage(identity,request,{signal}={}) { return callPrivateStorage({identity,credential:credentials.get(identity),projectId,environment,origin,publicKey,fetchImpl,now,request,signal}); }
  });
}

// Owns only authentication. Tracker keeps using its separate anonymous workspace.
export function createCloudAuth({ adapter, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, getPendingWork = () => null } = {}) {
  if (!adapter || adapter.kind !== 'supabase') throw safeError();
  const passwordLoginEnabled = adapter.enabled && adapter.environment === 'preview' && adapter.passwordLoginEnabled === true;
  let status = adapter.enabled ? 'signed-out' : 'local-only', step = null, notice = '', epoch = 0;
  let identity = null, challengeEmail = null, warning = null, refreshTimer = null, expiryTimer = null;
  let controller = new AbortController();
  const listeners = new Set(), leases = new WeakSet();
  const pending = () => { try { return getPendingWork(); } catch { return 'pending-unavailable'; } };
  function clearTimers() { clearTimer(refreshTimer); clearTimer(expiryTimer); refreshTimer = expiryTimer = null; }
  function invalidate({ keepIdentity = false, keepExpiry = false } = {}) {
    ++epoch; controller.abort(); controller = new AbortController(); warning = null; challengeEmail = null;
    clearTimer(refreshTimer); refreshTimer = null;
    if (!keepExpiry) { clearTimer(expiryTimer); expiryTimer = null; }
    if (!keepIdentity && identity) { adapter.seal(identity); identity = null; }
  }
  function checkExpiry() { if (identity && identity.expiresAt <= now()) expire(); }
  function read() {
    checkExpiry();
    const authenticated = status === 'authenticated' && identity;
    return {
      status, step, epoch, enabled: adapter.enabled, environment: adapter.environment, projectId: adapter.projectId, passwordLoginEnabled,
      verifiedAccountId: authenticated ? identity.uid : null,
      account: authenticated ? { uid: identity.uid, environment: identity.environment, projectId: identity.projectId, assurance: 'verified' } : null,
      activeWorkspace: 'anonymous-local', accountEditingEnabled: false, pendingWork: Boolean(pending()), notice
    };
  }
  function publish() { for (const listener of listeners) { try { listener(read()); } catch { /* Observer failure cannot change auth. */ } } }
  function approve(action, value, confirmation) {
    const key = JSON.stringify(pending());
    if (confirmation !== undefined) {
      const accepted = warning && warning.confirmation === confirmation && warning.epoch === epoch && warning.action === action && warning.value === value && warning.key === key;
      warning = null; return accepted ? null : { applied: false };
    }
    warning = null;
    if (!pending()) return null;
    const ticket = Object.freeze({}); warning = { confirmation: ticket, epoch, action, value, key };
    return { warning: true, confirmation: ticket };
  }
  function expire() {
    if (!identity && status !== 'authenticating') return { applied: false };
    invalidate(); clearTimers(); status = 'expired'; step = null;
    notice = 'Phiên đã hết hạn. Dữ liệu và phần nhập cục bộ vẫn được giữ.'; publish(); return { applied: true };
  }
  function schedule() {
    clearTimers();
    const scheduledIdentity = identity, scheduledEpoch = epoch;
    const remaining = scheduledIdentity.expiresAt - now();
    // A timer already queued by the browser can run even after clearTimeout.
    // Expiry still applies during refresh, while a new identity gets a new deadline.
    expiryTimer = setTimer(() => { if (identity === scheduledIdentity && now() >= scheduledIdentity.expiresAt) expire(); }, remaining);
    refreshTimer = setTimer(() => { if (identity === scheduledIdentity && epoch === scheduledEpoch) void refresh(); }, Math.max(1, remaining - Math.min(60000, remaining / 2)));
  }
  function accept(next, capturedEpoch) {
    if (capturedEpoch !== epoch || controller.signal.aborted) { adapter.seal(next); return { applied: false }; }
    if (!adapter.isIdentity(next) || next.environment !== adapter.environment || next.projectId !== adapter.projectId || next.assurance !== 'verified' || next.expiresAt <= now()) {
      adapter.seal(next); throw safeError();
    }
    identity = next; status = 'authenticated'; step = null; challengeEmail = null; notice = '';
    schedule(); publish(); return { applied: true };
  }
  async function begin(email, confirmation, switching = false, passwordLogin = false, password) {
    if (!adapter.enabled) return { applied: false };
    if (passwordLogin && !passwordLoginEnabled) return { applied: false };
    if (!emailAddress(email) || (passwordLogin && !passwordValue(password)) || (!switching && identity)) { notice = passwordLogin ? 'Kiểm tra thông tin đăng nhập hoặc dùng Đổi tài khoản.' : 'Kiểm tra email hoặc dùng Đổi tài khoản.'; publish(); return { applied: false }; }
    const gate = approve(passwordLogin ? switching ? 'switch-password' : 'login-password' : switching ? 'switch' : 'login', email, confirmation); if (gate) return gate;
    const previous = identity;
    // Start revocation while the previous credential still exists; sealing is immediate.
    if (previous) void adapter.logout(previous).catch(() => {});
    invalidate(); status = switching ? 'switching' : 'authenticating'; step = passwordLogin ? 'verifying' : 'requesting'; notice = ''; if (!passwordLogin) challengeEmail = email;
    const capturedEpoch = epoch, signal = controller.signal; publish();
    try {
      if (passwordLogin) return accept(await adapter.loginPassword(email, password, { signal }), capturedEpoch);
      await adapter.beginLogin(email, { signal });
      if (capturedEpoch !== epoch) return { applied: false };
      step = 'awaiting-code'; publish(); return { applied: true };
    } catch {
      if (capturedEpoch !== epoch) return { applied: false };
      invalidate(); status = 'error'; step = null; notice = safeError().message; publish(); return { applied: false };
    }
  }
  async function verifyOtp(token) {
    if (!challengeEmail || step !== 'awaiting-code' || !/^\d{6}$/.test(token || '')) { notice = 'Nhập mã OTP gồm 6 chữ số sau khi yêu cầu email.'; publish(); return { applied: false }; }
    const email = challengeEmail; invalidate(); challengeEmail = email; step = 'verifying'; notice = '';
    const capturedEpoch = epoch, signal = controller.signal; publish();
    try { return accept(await adapter.verifyOtp(email, token, { signal }), capturedEpoch); }
    catch {
      if (capturedEpoch !== epoch) return { applied: false };
      invalidate(); status = 'error'; step = null; notice = safeError().message; publish(); return { applied: false };
    }
  }
  async function refresh() {
    checkExpiry(); if (status !== 'authenticated' || !identity) return { applied: false };
    const previous = identity;
    invalidate({ keepIdentity: true, keepExpiry: true }); status = 'authenticating'; step = 'refreshing'; notice = '';
    const capturedEpoch = epoch, signal = controller.signal; publish();
    try { return accept(await adapter.refresh(previous, { signal }), capturedEpoch); }
    catch {
      if (capturedEpoch !== epoch) return { applied: false };
      expire(); return { applied: false };
    }
  }
  async function leave(next, confirmation) {
    const gate = approve(next, null, confirmation); if (gate) return gate;
    const previous = identity, revocation = previous ? adapter.logout(previous) : Promise.resolve();
    invalidate(); clearTimers(); status = next; step = null; notice = ''; const capturedEpoch = epoch; publish();
    try { await revocation; }
    catch { if (capturedEpoch === epoch) { notice = 'Đã đóng phiên trên thiết bị; chưa xác nhận thu hồi phiên tại nhà cung cấp.'; publish(); } }
    return { applied: true };
  }
  const api = {
    read, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    sendOtp: (email, confirmation) => begin(email, confirmation), verifyOtp, refresh, expire,
    switchAccount: (email, confirmation) => begin(email, confirmation, true),
    loginPassword: (email, password, confirmation) => begin(email, confirmation, false, true, password),
    switchAccountPassword: (email, password, confirmation) => begin(email, confirmation, true, true, password),
    logout: confirmation => leave('signed-out', confirmation), localOnly: confirmation => leave('local-only', confirmation),
    cancelWarning() { warning = null; },
    cancelLogin() {
      warning = null;
      if (identity) return { applied: false };
      invalidate(); status = adapter.enabled ? 'signed-out' : 'local-only'; step = null; notice = ''; publish(); return { applied: true };
    },
    capture() {
      checkExpiry(); if (status !== 'authenticated' || !identity) throw safeError();
      const lease = Object.freeze({ epoch, signal: controller.signal }); leases.add(lease); return lease;
    },
    isCurrent(lease) { checkExpiry(); return Boolean(leases.has(lease) && lease.epoch === epoch && !lease.signal.aborted && status === 'authenticated'); },
    async gatewayCall(lease, route, body, { signal } = {}) {
      if (!api.isCurrent(lease)) throw safeError();
      const combined = new AbortController(), abort = () => combined.abort();
      for (const item of [lease.signal,signal].filter(Boolean)) { if (item.aborted) abort(); else item.addEventListener('abort',abort,{once:true}); }
      try { const result=await adapter.callGateway(identity,route,body,{signal:combined.signal}); if(!api.isCurrent(lease)||combined.signal.aborted)throw safeError();return result; }
      finally {for(const item of [lease.signal,signal].filter(Boolean))item.removeEventListener('abort',abort);}
    },
    async storageCall(lease,request,{signal}={}) {
      if(!api.isCurrent(lease))throw safeError();
      const combined=new AbortController(),abort=()=>combined.abort();
      for(const item of [lease.signal,signal].filter(Boolean)){if(item.aborted)abort();else item.addEventListener('abort',abort,{once:true});}
      try{const result=await adapter.callStorage(identity,request,{signal:combined.signal});if(!api.isCurrent(lease)||combined.signal.aborted)throw safeError();return result;}
      finally{for(const item of [lease.signal,signal].filter(Boolean))item.removeEventListener('abort',abort);}
    }
  };
  return Object.freeze(api);
}
