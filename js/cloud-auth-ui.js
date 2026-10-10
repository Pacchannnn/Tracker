const LABELS = {
  'local-only': 'Chỉ trên thiết bị · Cục bộ',
  'signed-out': 'Chưa đăng nhập',
  authenticating: 'Đang đăng nhập',
  authenticated: 'Đã đăng nhập',
  expired: 'Phiên đã hết hạn',
  switching: 'Đang đổi tài khoản',
  error: 'Lỗi xác thực'
};

export function createCloudAuthUI({ auth, helpers, workspaceAvailable = false }) {
  const { node, button, field, panel, div, p, h2 } = helpers;
  let host = null, email = '', otp = '', changingAccount = false, warning = null, uiNotice = '';
  async function act(action, value, confirmation) {
    try {
      const result = value === undefined ? await auth[action](confirmation) : await auth[action](value, confirmation);
      warning = result.warning ? { action, value, confirmation: result.confirmation } : null;
      uiNotice = '';
    } catch { uiNotice = 'Không thể xác thực. Thử lại sau.'; warning = null; }
    if (host?.isConnected) render();
  }
  function render() {
    const state = auth.read();
    const signedIn = state.status === 'authenticated';
    if (signedIn && !changingAccount) { email = ''; otp = ''; }
    const status = p(LABELS[state.status] || 'Lỗi xác thực', 'summary'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    host.replaceChildren(h2('Tài khoản Cloud'), status,
      p(workspaceAvailable ? 'Đăng nhập xác minh tài khoản. Xem không gian đang dùng và trạng thái đồng bộ trong mục Không gian dữ liệu. Đăng nhập không tự chuyển, ghi đè hay gộp dữ liệu cục bộ.' : 'Tracker tiếp tục dùng không gian ẩn danh cục bộ trên trình duyệt này. Dữ liệu chưa được đồng bộ hoặc tải lên; đăng nhập không chuyển, ghi đè hay gộp dữ liệu.', 'hint'));
    if (!workspaceAvailable) { const accountEditing = button('Chỉnh sửa dữ liệu tài khoản · chưa khả dụng', () => {}); accountEditing.disabled = true; host.append(accountEditing); }
    else host.append(p('Chọn rõ Mở dữ liệu tài khoản trong mục Không gian dữ liệu để dùng kho riêng; dữ liệu cục bộ không tự chuyển sang đó.', 'hint'));
    if (!state.enabled) { host.append(p('Supabase chưa được cấu hình hoặc phê duyệt. Bạn tiếp tục dùng Tracker cục bộ.', 'hint')); return; }
    host.append(p('Phiên đăng nhập chỉ giữ trong bộ nhớ; tải lại trang sẽ đăng xuất. Chỉ tài khoản đã được chuẩn bị trong dự án được duyệt mới nhận mã.', 'hint'));
    if (state.notice || uiNotice) { const error = p(state.notice || uiNotice, 'warning'); error.setAttribute('role', 'alert'); host.append(error); }
    if (warning) {
      const current = warning;
      host.append(p(workspaceAvailable
        ? 'Có phần chưa lưu hoặc đang chờ đồng bộ. Dữ liệu đã lưu và outbox được giữ trong kho riêng; khi đổi không gian, các ô chưa lưu sẽ đóng. Hủy để lưu trước, hoặc tiếp tục?'
        : 'Có phần chưa lưu hoặc đang soạn. Chuyển phiên xác thực vẫn giữ phần nhập và dữ liệu cục bộ. Tiếp tục?', 'warning'), div('actions',
        button('Hủy chuyển', () => { auth.cancelWarning(); warning = null; render(); }),
        button('Tiếp tục', () => act(current.action, current.value, current.confirmation))));
      return;
    }
    const busy = ['requesting', 'verifying', 'refreshing'].includes(state.step);
    if (!signedIn || changingAccount) {
      const form = node('form', { class: 'form-grid', 'data-cloud-auth-form': '' });
      const emailField = field('Email tài khoản', 'cloudEmail', email, { type: 'email', required: true });
      const emailInput = emailField.querySelector('input');
      emailInput.setAttribute('autocomplete', 'email'); emailInput.disabled = busy;
      emailInput.addEventListener('input', () => { email = emailInput.value; });
      form.append(emailField);
      const send = button('Gửi mã OTP', () => act(changingAccount || signedIn ? 'switchAccount' : 'sendOtp', email.trim())); send.disabled = busy; form.append(send);
      if (state.step === 'awaiting-code') {
        const codeField = field('Mã OTP gồm 6 chữ số', 'cloudOtp', otp, { type: 'text', required: true });
        const code = codeField.querySelector('input');
        code.setAttribute('inputmode', 'numeric'); code.setAttribute('autocomplete', 'one-time-code'); code.setAttribute('pattern', '[0-9]{6}'); code.setAttribute('maxlength', '6');
        code.addEventListener('input', () => { otp = code.value; }); form.append(codeField, button('Xác nhận mã OTP', () => act('verifyOtp', otp)));
      }
      form.addEventListener('submit', event => { event.preventDefault(); if (!busy) void act(state.step === 'awaiting-code' ? 'verifyOtp' : changingAccount || signedIn ? 'switchAccount' : 'sendOtp', state.step === 'awaiting-code' ? otp : email.trim()); });
      host.append(form);
      if (state.step === 'awaiting-code') host.append(p('Đã yêu cầu gửi mã. Thông báo này chưa xác nhận email đã được gửi hoặc địa chỉ có tài khoản.', 'hint'));
    }
    const actions = div('actions');
    if (signedIn && !changingAccount) actions.append(button('Đổi tài khoản', () => { changingAccount = true; email = ''; otp = ''; render(); }));
    if (signedIn || ['authenticating', 'switching', 'expired', 'error'].includes(state.status)) actions.append(button('Đăng xuất', () => { changingAccount = false; void act('logout'); }));
    actions.append(button('Tiếp tục cục bộ', () => { changingAccount = false; void act('localOnly'); })); host.append(actions);
  }
  auth.subscribe(state => { warning = null; if (state.status === 'authenticated') changingAccount = false; if (host?.isConnected) render(); });
  return Object.freeze({ mount() { host = panel(); host.setAttribute('data-cloud-auth', ''); render(); return host; } });
}
