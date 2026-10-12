import { prepareImportPreview } from './cloud-import-preview.js?v=41';

const LABELS = { local: 'Chỉ trên thiết bị', 'local-only': 'Chỉ trên thiết bị', syncing: 'Đang đồng bộ', pending: 'Chờ đồng bộ', synced: 'Đã đồng bộ', conflict: 'Có xung đột', offline: 'Mất kết nối', needsLogin: 'Cần đăng nhập lại', 'needs-login': 'Cần đăng nhập lại', failed: 'Đồng bộ thất bại', error:'Đồng bộ thất bại', auth:'Cần đăng nhập lại', paused: 'Đã tạm dừng đồng bộ' };
const scopeKey = state => JSON.stringify([state.mode, state.uid, state.environment, state.projectId]);
export function createCloudWorkspaceUI({ workspace, auth, helpers, loadAnonymous, listAnonymousPhotoMetadata }) {
  const { node, button, panel, div, p, h2 } = helpers;
  let host = null, busy = false, notice = '', review = null, preview = null, generation = 0, scope = '', warning = null, cached = [];
  function currentKey() { return scopeKey(workspace.read()); }
  function invalidate() { generation++; review = preview = warning = null; busy = false; }
  async function act(action, args = [], confirmation) {
    if (busy) return;
    const request = ++generation, before = currentKey(); busy = true; notice = ''; render();
    try {
      const result = confirmation === undefined ? await workspace[action](...args) : await workspace[action](...args, confirmation);
      if (request !== generation) return;
      warning = result?.warning ? { action, args, confirmation: result.confirmation } : null;
      if (action === 'resolveConflict') {
        if (result?.applied === true) review = null;
        else {
          const messages = {
            copy_required: 'Bản server đã bị xóa. Bản trên máy vẫn được giữ; cần luồng tạo bản sao có chủ đích, không tự khôi phục mục đã xóa.',
            compound_review_required: 'Xung đột gồm nhiều thao tác cần xem lại cùng nhau. Bản đang chờ vẫn được giữ; không thể tự gộp bằng nút này.',
            review_changed: 'Dữ liệu đã đổi từ lúc so sánh. Hãy xem xung đột lại trước khi chọn.'
          };
          notice = messages[result?.code] || 'Chưa giải quyết được xung đột. Hai phiên bản vẫn được giữ; hãy xem lại.';
          if (result?.code === 'review_changed') review = null;
        }
      } else if (result?.applied === false && !warning) notice = 'Chưa chuyển không gian. Dữ liệu hoặc phần đang soạn đã đổi; hãy kiểm tra và thử lại.';
      if (before !== currentKey()) { review = preview = null; }
    } catch { if (request === generation) notice = 'Thao tác chưa hoàn tất. Dữ liệu đang chờ vẫn được giữ; thử lại hoặc đăng nhập lại.'; }
    finally { if (request === generation) { busy = false; if (host?.isConnected) render(); } }
  }
  async function showConflict(id) {
    if (busy) return;
    const request = ++generation, before = currentKey(); busy = true; render();
    try {
      const value = await workspace.getConflict(id);
      if (request === generation && before === currentKey() && value?.reviewToken !== undefined) review = value;
    } catch { if (request === generation) notice = 'Không đọc được xung đột. Bản chưa giải quyết vẫn được giữ.'; }
    finally { if (request === generation) { busy = false; if (host?.isConnected) render(); } }
  }
  async function showPreview() {
    if (busy) return;
    const request = ++generation, before = currentKey(), state = workspace.read(); busy = true; notice = ''; render();
    try {
      const anonymous = await loadAnonymous();
      const accountData = workspace.getData ? await workspace.getData() : state.data;
      const photos = await listAnonymousPhotoMetadata();
      const value = prepareImportPreview(anonymous, accountData, photos, state);
      if (request === generation && before === currentKey()) preview = value;
    } catch { if (request === generation) notice = 'Không chuẩn bị được bản xem trước. Nguồn cục bộ được giữ nguyên.'; }
    finally { if (request === generation) { busy = false; if (host?.isConnected) render(); } }
  }
  function control(label, action) { const item = button(label, action); item.disabled = busy; return item; }
  function render() {
    if (!host) return;
    const state = workspace.read(), nextScope = scopeKey(state);
    if (scope && scope !== nextScope) invalidate(); scope = nextScope;
    let status = state.mode === 'local' ? 'local' : state.syncStatus;
    if (!['paused','needs-login','needsLogin'].includes(status)&&(state.conflicts?.length||state.photoConflicts?.length)) status = 'conflict'; else if (status === 'synced' && (state.outboxCount !== 0||state.photoPendingCount>0)) status = 'pending';
    const statusNode = p(LABELS[status] || 'Cần đăng nhập lại', 'summary'); statusNode.setAttribute('role', 'status'); statusNode.setAttribute('aria-live', 'polite');
    host.replaceChildren(h2('Không gian dữ liệu'), statusNode);
    host.append(p(state.mode === 'local' ? 'Đang dùng dữ liệu ẩn danh cục bộ. Mở tài khoản không nhập, ghi đè hay gộp lịch sử này.' : 'Dữ liệu tài khoản được lưu riêng. Ảnh cục bộ chưa được chuyển lên cloud.', 'hint'));
    if (Number.isInteger(state.outboxCount)) host.append(p(`Thao tác chờ: ${state.outboxCount}`, 'hint'));
    else host.append(p('Thao tác chờ: chưa đọc được khi kho chưa mở. Dữ liệu đã lưu vẫn được giữ.', 'hint'));
    if(state.mode==='account'&&Number.isInteger(state.photoPendingCount))host.append(p(`Thao tác ảnh chờ: ${state.photoPendingCount}. Ảnh tài khoản và ảnh cục bộ ở kho riêng.`, 'hint'));
    for(const job of state.photoConflicts??[])host.append(node('details',{},[node('summary',{text:'Xung đột ảnh: xem các bản được giữ'}),p('Không tự ghi đè. Các bản base/local/remote và bytes được giữ để review và export recovery.','hint'),node('pre',{class:'contract-preview',text:JSON.stringify(job.conflict,null,2)})]));
    if (notice) { const error = p(notice, 'warning'); error.setAttribute('role', 'alert'); host.append(error); }
    if (warning) {
      const selected = warning;
      host.append(p('Có dữ liệu đang soạn hoặc chờ đồng bộ. Outbox và dữ liệu đã lưu được giữ trong kho riêng; các ô chưa lưu trên màn hình sẽ đóng. Hủy để lưu trước, hoặc tiếp tục?', 'warning'), div('actions',
        control('Hủy chuyển không gian', () => { workspace.cancelWarning?.(); warning = null; render(); }),
        control('Xác nhận chuyển không gian', () => act(selected.action, selected.args, selected.confirmation)))); return;
    }
    const account = auth.read().account;
    const actions = div('actions');
    if (['sealed','opening'].includes(state.mode)) actions.append(control('Chuyển về cục bộ',()=>act('localOnly')));
    if (state.mode !== 'account') {
      const open = control('Mở dữ liệu tài khoản', () => act('openAccount')); open.disabled = busy || !account || account.assurance !== 'verified'; actions.append(open);
    } else {
      if (state.cached) {
        const open = control('Mở dữ liệu tài khoản', () => act('openAccount')); open.disabled = busy || !account || account.assurance !== 'verified'; actions.append(open);
      }
      const sync = control('Đồng bộ ngay', () => act('sync'));
      sync.disabled = busy || state.cached || !account || account.assurance !== 'verified' || Boolean(state.uid && (account.uid !== state.uid || account.environment !== state.environment || account.projectId !== state.projectId));
      actions.append(sync, control('Tải lại dữ liệu mới nhất', () => act('refresh')),
        control(status === 'paused' ? 'Tiếp tục đồng bộ' : 'Tạm dừng đồng bộ', () => act(status === 'paused' ? 'resume' : 'pause')),
        control('Chuyển về cục bộ', () => act('localOnly')));
      actions.append(control('Xem trước dữ liệu cục bộ', showPreview));
    }
    host.append(actions);
    if (state.mode === 'account' && state.deviceId) host.append(node('details', {}, [
      node('summary', { text: 'Thông tin thiết bị cho setup preview' }),
      p('Chỉ dùng các ID này để đăng ký đúng tài khoản và thiết bị. Xem thông tin không tự đăng ký hoặc tải dữ liệu lên.', 'hint'),
      node('pre', { text: JSON.stringify({ environment: state.environment, projectId: state.projectId, uid: state.uid, deviceId: state.deviceId }, null, 2), style: 'white-space:pre-wrap;overflow-wrap:anywhere' })
    ]));
    if (state.mode !== 'account' && workspace.cachedScopes) host.append(control('Tài khoản đã lưu trên thiết bị', async () => {
      try { cached = await workspace.cachedScopes(); if (host?.isConnected) render(); } catch { notice = 'Không đọc được danh sách kho tài khoản.'; render(); }
    }));
    if (state.mode !== 'account' && cached.length) {
      host.append(p('Mở bản lưu trên thiết bị không xác minh phiên đăng nhập. Cần đăng nhập đúng tài khoản để đồng bộ. Khóa kho không mã hóa dữ liệu.', 'hint'));
      for (const item of cached) host.append(control(`${item.uid} · ${item.environment} · ${item.projectId}`, () => act('openCached', [item])));
    }
    if (state.mode === 'account' && workspace.availableLive && workspace.selectLive && workspace.getData) {
      try {
        if (!workspace.getData()?.draft) {
          const live = workspace.availableLive();
          if (live.length) host.append(h2('Buổi đang tập trên tài khoản'), p('Chọn buổi để tiếp tục trên thiết bị này. Mở danh sách không tự chọn buổi hoặc sửa buổi trên server.', 'hint'));
          for (const item of live) {
            const title = item.payload?.workoutSnapshot?.name || (item.payload?.workout ? `Buổi ${item.payload.workout}` : 'Chưa có tên');
            const choice = control(`Tiếp tục buổi đang tập · ${item.payload?.date || 'Chưa rõ ngày'} · ${title} · ${item.recordId}`, () => act('selectLive', [item.recordId]));
            choice.setAttribute('style', 'white-space:normal;overflow-wrap:anywhere;max-width:100%'); host.append(choice);
          }
        }
      } catch { host.append(p('Chưa đọc được danh sách buổi đang tập. Mở lại không gian tài khoản để thử lại.', 'hint')); }
    }
    for (const item of state.conflicts || []) {
      const identities = item.identities?.length ? item.identities : [{ kind: item.kind, recordId: item.recordId }];
      const label = identities.map(value => `${value.kind || ''} ${value.recordId || ''}`.trim()).join(' · ');
      const choice = control(`Xem xung đột · ${label}`, () => showConflict(item.id)); choice.setAttribute('style', 'white-space:normal;overflow-wrap:anywhere;max-width:100%'); host.append(choice);
    }
    if (review) {
      const current = review;
      host.append(h2('So sánh xung đột'), p('Chọn rõ một phương án. Giữ bản trên máy tạo đề xuất mới dựa trên bản server đã xem; không tự chọn theo thời gian.', 'hint'));
      for (const [label, value] of [['Bản gốc', current.base], ['Bản trên máy', current.local], ['Bản server', current.remote]]) host.append(node('details', {}, [node('summary', { text: label }), node('pre', { text: JSON.stringify(value ?? null, null, 2), style: 'white-space:pre-wrap;overflow-wrap:anywhere;max-height:20rem;overflow:auto' })]));
      host.append(div('actions', control('Dùng bản server', () => act('resolveConflict', [current.id, 'remote', current.reviewToken])), control('Giữ bản trên máy', () => act('resolveConflict', [current.id, 'local', current.reviewToken])), control('Đóng so sánh', () => { review = null; render(); })));
    }
    if (preview) {
      host.append(h2('Xem trước chuyển dữ liệu'), p('Chưa nhập, chưa tải lên và chưa thay đổi dữ liệu. Đây là chuẩn bị cho Batch 3.', 'hint'),
        p(`Ứng viên: ${preview.candidates.length} · Trùng ID: ${preview.duplicates.length} · Cần xem lại: ${preview.ambiguities.length}`),
        p(`JSON: ${preview.jsonBytes} byte · Ảnh: ${preview.photoCount ?? 'Chưa rõ'} · Dung lượng ảnh: ${preview.photoBytes === null ? 'Chưa rõ' : `${preview.photoBytes} byte`}`),
        p('Chủ sở hữu, định dạng và trùng lặp còn cần kiểm tra và phê duyệt trước khi nhập.', 'hint'), control('Hủy xem trước', () => { ++generation; preview = null; render(); }));
      for (const item of [...preview.duplicates, ...preview.ambiguities]) host.append(node('details', {}, [node('summary', { text: `${item.reason || 'duplicate-id'} · ${item.kind || item.field || ''} ${item.recordId || ''}` }), node('pre', { text: JSON.stringify(item, null, 2), style: 'white-space:pre-wrap;overflow-wrap:anywhere;max-height:20rem;overflow:auto' })]));
    }
  }
  workspace.subscribe(() => { if (host?.isConnected) render(); });
  auth.subscribe(() => { invalidate(); if (host?.isConnected) render(); });
  return Object.freeze({ mount() { host = panel(); host.setAttribute('data-cloud-workspace', ''); render(); return host; } });
}
