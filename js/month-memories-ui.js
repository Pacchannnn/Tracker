import { deriveMonthMemories, lifeReviewPeriod } from './life-review.js?v=40';
import { resolveLifeSource } from './life-review-source.js?v=40';
import { localDate, validDate } from './data.js?v=40';
import { MOODS } from './journal.js?v=40';
import { listPhotoMetadata, getPhotoThumbnail, getPhoto, PHOTO_CATEGORIES, PHOTO_POSES } from './photo-store.js?v=40';

const LABELS = { journal: 'Nhật ký', mood: 'Tâm trạng', workout: 'Tập luyện', nutrition: 'Dinh dưỡng', cardio: 'Cardio', checkin: 'Check-in', knee: 'Gối', photos: 'Ảnh', photo: 'Ảnh' };
const CHANGED = 'Bản ghi đã thay đổi hoặc không còn ở ngày này.';

export function createMonthMemoriesUI({ main, helpers, readData, readMetadata = listPhotoMetadata,
  today = localDate, openSource, openDay, readThumbnail = getPhotoThumbnail, readOriginal = getPhoto, urlAPI = URL }) {
  const { node, button, field, panel, div, p, h2, h3, fmt } = helpers;
  let anchor = null, generation = 0, host = null, period = null, pendingReturn = null, inputError = '', returnFocusCleanup = null;
  let focusItems = new Map(), dateHeadings = new Map(), cards = new Map(), viewer = null, imageGeneration = 0;
  const urls = new Set(), refKey = ref => JSON.stringify(ref);
  const win = () => main.ownerDocument?.defaultView;
  const active = () => main.ownerDocument?.activeElement;
  const safeReason = code => ({ code, message: code === 'photo-read-error' ? 'Chưa đọc được kho ảnh' : 'Chưa đọc được dữ liệu JSON' });
  function mark(item, key) { item.setAttribute('data-life-focus', key); item.setAttribute('data-month-focus', key); focusItems.set(key, item); return item; }
  function heading(title, key, sub = false) {
    const item = (sub ? h3 : h2)(title); item.setAttribute('tabindex', '-1'); return mark(item, key);
  }
  function control(label, action, name) {
    const item = button(label, action); item.style.minHeight = '48px'; item.style.whiteSpace = 'normal';
    if (name) { item.setAttribute('name', name); mark(item, `control:${name}`); }
    return item;
  }
  function getContext(originatingDate = null, ref = null, focusKey = null) {
    return { mode: 'month', monthAnchor: anchor, originatingDate: ref?.date ?? originatingDate,
      originatingRef: ref ? { ...ref } : null,
      focusKey: focusKey || active()?.getAttribute?.('data-life-focus') || 'period', scrollPosition: win()?.scrollY ?? 0 };
  }
  function focusTarget(target, context = null) {
    for (let parent = target?.parentNode; parent && parent !== host; parent = parent.parentNode) {
      if (parent.tagName?.toLowerCase() === 'details') parent.open = true;
    }
    if (Number.isFinite(context?.scrollPosition)) win()?.scrollTo?.({ top: context.scrollPosition });
    target?.focus({ preventScroll: true });
    const bounds = target?.getBoundingClientRect?.();
    const navBounds = main.ownerDocument?.querySelector?.('.mobile-nav')?.getBoundingClientRect?.();
    const bottom = navBounds?.height > 0 ? navBounds.top : win()?.innerHeight;
    if (bounds && (bounds.top < 0 || (Number.isFinite(bottom) && bounds.bottom > bottom))) target.scrollIntoView?.({ block: 'center' });
  }
  function restoreReturn(context) {
    if (!context) return;
    const exact = context.originatingRef ? focusItems.get(`item:${refKey(context.originatingRef)}`) : null;
    focusTarget(focusItems.get(context.focusKey) || exact || dateHeadings.get(context.originatingDate) || focusItems.get('timeline') || focusItems.get('period'), context);
  }
  function preserveControlFocus() {
    const item = active(), key = item?.getAttribute?.('data-life-focus');
    if (key?.startsWith('control:') && focusItems.get(key) === item) pendingReturn = getContext(null, null, key);
  }
  function showInputError(message) {
    inputError = message;
    host?.querySelector('[name="monthMemoriesMonth"]')?.setAttribute('aria-invalid', message ? 'true' : 'false');
    const error = focusItems.get('period-error'); if (error) error.textContent = message;
  }
  function select(date, capturedToday = today()) {
    try {
      const selected = lifeReviewPeriod('month', date, capturedToday);
      preserveControlFocus(); anchor = selected.anchor; inputError = ''; void renderView({ capturedToday }); return true;
    } catch {
      showInputError(validDate(date) ? 'Khoảng ngày ngoài phạm vi hỗ trợ' : 'Tháng muốn xem không hợp lệ. Chọn tháng hợp lệ.'); return false;
    }
  }
  function returnTo(context) { if (context?.monthAnchor) anchor = context.monthAnchor; pendingReturn = context ? { ...context } : null; inputError = ''; }
  function revoke(url) { if (url && urls.delete(url)) urlAPI.revokeObjectURL(url); }
  function cancelCandidate() { imageGeneration++; if (viewer?.candidate) { revoke(viewer.candidate.url); viewer.candidate = null; } }
  function closeViewer(restoreFocus = false) {
    cancelCandidate(); const previous = viewer; viewer = null;
    if (!previous) return;
    previous.root.remove(); revoke(previous.url);
    if (restoreFocus && previous.opener?.isConnected) focusTarget(previous.opener);
  }
  function invalidate() {
    generation++; returnFocusCleanup?.(); returnFocusCleanup = null; closeViewer(); host = null; focusItems = new Map(); dateHeadings = new Map(); cards = new Map();
  }
  function sourceButton(ref, suffix = '') {
    const key = `source:${refKey(ref)}${suffix}`;
    const item = mark(control(`Mở nguồn · ${LABELS[ref.kind]} · ${ref.date} · ID ${ref.id}`, () => {
      if (ref.kind === 'photo') openPhoto(ref, item);
      else openSource({ ...ref }, getContext(ref.date, ref, key));
    }), key);
    item.setAttribute('data-memory-source', ref.id); return item;
  }
  function dayButton(date, suffix = '') {
    const ref = { kind: 'day', date }, key = `day:${date}${suffix}`;
    return mark(control(`Xem ngày · ${date}`, () => openDay(date, getContext(date, ref, key))), key);
  }
  function evidence(label, refs, key, dates = []) {
    const details = node('details', { class: 'life-review-sources' }, [node('summary', { text: `Xem bản ghi · ${label}` })]);
    const list = node('ol');
    for (const ref of refs) list.append(node('li', {}, [sourceButton(ref, `:${key}`)]));
    if (!refs.length) {
      details.append(p('Chưa có bản ghi đóng góp cho mục này.', 'hint'));
      for (const date of dates) list.append(node('li', {}, [dayButton(date, `:${key}`)]));
    }
    details.append(list); return details;
  }
  function header() {
    const selector = field('Tháng muốn xem', 'monthMemoriesMonth', anchor.slice(0, 7), { type: 'month', required: true });
    const input = selector.querySelector('input'); mark(input, 'control:monthMemoriesMonth');
    input.setAttribute('aria-describedby', 'month-memories-period-error'); input.setAttribute('aria-invalid', inputError ? 'true' : 'false');
    input.addEventListener('change', () => select(/^\d{4}-\d{2}$/.test(input.value) ? `${input.value}-01` : input.value));
    input.addEventListener('input', () => showInputError(''));
    const error = mark(p(inputError, 'notice'), 'period-error'); error.setAttribute('id', 'month-memories-period-error'); error.setAttribute('role', 'alert');
    const nav = (label, key, name) => { const item = control(label, () => select(period[key]), name); item.disabled = period[key] == null; return item; };
    const current = control('Tháng hiện tại', () => { const capturedToday = today(); select(capturedToday, capturedToday); }, 'monthMemoriesCurrent');
    current.disabled = period.currentAnchor == null;
    host.append(panel(heading('Ký ức tháng', 'period'), p(`${period.start} → ${period.end}`, 'summary'),
      p(`Tính đến ${period.today} · ${period.calendarDays} ngày trong lịch · ${period.eligibleDays} ngày đến hạn`, 'hint'), selector, error,
      div('actions', nav('← Tháng trước', 'previousAnchor', 'monthMemoriesPrevious'), nav('Tháng sau →', 'nextAnchor', 'monthMemoriesNext'), current,
        control('Làm mới', () => { preserveControlFocus(); void renderView(); }, 'monthMemoriesRefresh'))));
  }
  const value = (saved, unit = '') => saved == null || saved === '' ? 'Chưa ghi' : `${typeof saved === 'number' ? fmt(saved) : saved}${unit ? ` ${unit}` : ''}`;
  function preview(kind, saved) {
    switch (kind) {
      case 'journal': {
        const mood = saved.moodID === null ? 'Chưa đọc được Tâm trạng' : saved.moodID === '' ? 'Chưa ghi' : MOODS.find(item => item.value === saved.moodID)?.label;
        return [p(saved.title, 'summary'), p(`Tâm trạng: ${mood}`, 'hint'), p(saved.noteExcerpt), p(`Thẻ hoạt động do bạn ghi: ${saved.tags.length ? saved.tags.join(' · ') : 'Chưa ghi'}`, 'hint')];
      }
      case 'workout': return [p(saved.savedTitle, 'summary'), p(`${saved.setCount} hiệp đã lưu`, 'hint')];
      case 'nutrition': return [p(saved.name, 'summary'), p(`Khẩu phần đã lưu: ${saved.serving} · Số phần: ${fmt(saved.servings)} · Bữa: ${saved.meal}`, 'hint')];
      case 'cardio': return [p(saved.activity, 'summary'), p(`Thời lượng: ${value(saved.durationMinutes, 'min')} · Quãng đường: ${value(saved.distanceKm, 'km')} · Cường độ đã ghi: ${value(saved.intensity)}`, 'hint')];
      case 'checkin': return [p(`Cân nặng: ${value(saved.weight, 'kg')} · Vòng eo: ${value(saved.waist, 'cm')} · Giấc ngủ: ${value(saved.sleep, 'giờ')}`, 'hint'), p(`Gối: ${value(saved.knee)}`), p(value(saved.notes))];
      case 'knee': {
        const moment = { during: 'Trong buổi tập', after: 'Sau buổi tập', 'next-morning': 'Sáng hôm sau' }[saved.moment];
        const status = savedStatus => ({ unknown: 'Chưa rõ', no: 'Không', yes: 'Có' })[savedStatus];
        return [node('details', {}, [node('summary', { text: 'Chi tiết gối đã ghi' }), p(`Thời điểm: ${moment} · Đau: ${value(saved.pain)}`),
          p(`Sưng: ${status(saved.swelling)} · Không vững: ${status(saved.instability)} · Cứng: ${status(saved.stiffness)}`), p(value(saved.notes))])];
      }
      case 'photo': return [p(`Loại ảnh đã ghi: ${PHOTO_CATEGORIES.find(item => item.value === saved.category)?.label}`, 'hint'),
        p(`Góc chụp đã ghi: ${saved.pose ? PHOTO_POSES.find(item => item.value === saved.pose)?.label : 'Chưa ghi'}`, 'hint'), p(value(saved.note))];
      default: return [];
    }
  }
  function photoAction(label, actionName, ref, fn, suffix = '') {
    const item = mark(control(label, fn), `photo:${actionName}:${refKey(ref)}${suffix}`);
    item.setAttribute('data-memory-action', actionName); item.setAttribute('aria-label', `${label} · ${ref.date} · ID ${ref.id}`); return item;
  }
  function ensureViewer(ref, opener) {
    if (viewer && refKey(viewer.ref) !== refKey(ref)) closeViewer();
    if (!viewer) {
      const root = div('month-memory-viewer'), status = p('', 'hint'), display = div('month-memory-image'), actions = div('actions');
      status.setAttribute('role', 'status'); root.append(status, display, actions);
      viewer = { root, status, display, actions, url: null, image: null, candidate: null };
    }
    viewer.ref = { ...ref }; viewer.opener = opener;
    viewer.actions.replaceChildren(photoAction('Xem ảnh đầy đủ', 'original', ref, () => { void loadImage(ref, 'original'); }),
      photoAction('Đóng ảnh', 'close', ref, () => closeViewer(true)));
    cards.get(refKey(ref))?.append(viewer.root);
  }
  function openPhoto(ref, opener) {
    ensureViewer(ref, opener); focusTarget(viewer.actions.children[0]); void loadImage(ref, 'thumbnail');
  }
  async function loadImage(ref, variant) {
    cancelCandidate(); const request = imageGeneration, viewRequest = generation, selected = viewer;
    const isCurrent = () => request === imageGeneration && viewRequest === generation && viewer === selected && selected.root.isConnected;
    const failure = variant === 'thumbnail' ? 'Chưa đọc được ảnh thu nhỏ.' : 'Chưa đọc được ảnh đầy đủ.';
    selected.status.textContent = `Đang đọc ${variant === 'thumbnail' ? 'ảnh thu nhỏ' : 'ảnh đầy đủ'} · ${ref.date} · ID ${ref.id}`;
    let metadata;
    try { metadata = await readMetadata(); } catch { if (isCurrent()) selected.status.textContent = 'Chưa đọc được kho ảnh; bản ghi ảnh vẫn được giữ trong tháng.'; return; }
    if (!isCurrent()) return;
    let recorded;
    try { recorded = resolveLifeSource(null, metadata, ref).record; }
    catch { selected.status.textContent = CHANGED; return; }
    let result;
    try { result = await (variant === 'thumbnail' ? readThumbnail(ref.id) : readOriginal(ref.id)); }
    catch { if (isCurrent()) selected.status.textContent = failure; return; }
    if (!isCurrent()) return;
    if (variant === 'original' && (!result || result.id !== ref.id || result.date !== ref.date)) { selected.status.textContent = result ? CHANGED : failure; return; }
    const binary = variant === 'thumbnail' ? result : result.blob;
    if (!(binary instanceof Blob) || !binary.size) { selected.status.textContent = failure; return; }
    let url;
    try { url = urlAPI.createObjectURL(binary); urls.add(url); } catch { selected.status.textContent = failure; return; }
    const alt = `Ảnh · ${PHOTO_CATEGORIES.find(item => item.value === recorded.category)?.label ?? recorded.category} · ${ref.date} · ID ${ref.id}${recorded.pose ? ` · ${PHOTO_POSES.find(item => item.value === recorded.pose)?.label ?? recorded.pose}` : ''}${recorded.note ? ` · ${recorded.note}` : ''}`;
    const img = node('img', { alt }); img.style.maxWidth = '100%';
    selected.candidate = { url, image: img };
    img.addEventListener('load', () => {
      if (!isCurrent() || selected.candidate?.image !== img) { revoke(url); return; }
      const previousURL = selected.url;
      selected.display.replaceChildren(img); selected.url = url; selected.image = img; selected.candidate = null;
      selected.status.textContent = `${variant === 'thumbnail' ? 'Ảnh thu nhỏ' : 'Ảnh đầy đủ'} · ${ref.date} · ID ${ref.id}`;
      revoke(previousURL);
    });
    img.addEventListener('error', () => {
      revoke(url);
      if (viewer !== selected || viewRequest !== generation) return;
      if (selected.candidate?.image === img) { selected.candidate = null; selected.status.textContent = failure; }
      else if (selected.image === img) { selected.display.replaceChildren(); selected.image = null; selected.url = null; selected.status.textContent = 'Chưa đọc được ảnh đang mở.'; }
    });
    // Decode the candidate before replacing the currently visible image.
    img.setAttribute('src', url);
  }
  function summary(review) {
    if (review.unavailableDomains.some(item => item.reason?.code === 'canonical-load-error')) host.append(p('Chưa đọc được dữ liệu JSON. Kho ảnh được đọc riêng.', 'notice'));
    if (review.empty === true) host.append(p('Chưa có dữ liệu được ghi trong khoảng này', 'empty'));
    else if (review.empty === null) host.append(p('Chưa xác định khoảng này có trống hay không vì có nguồn chưa đọc được.', 'notice'));
    if (!period.eligibleDays) host.append(p('Khoảng này chưa có ngày đến hạn.', 'hint'));
    else if (review.sourceDays.length && !review.sourceDays.some(day => day.date <= period.today)) host.append(p('Chưa có bản ghi trong các ngày đến hạn; tháng này có bản ghi có ngày sau hôm nay.', 'hint'));
    const coverageCard = panel(heading('Ngày có ghi', 'coverage')); host.append(coverageCard);
    for (const [kind, coverage] of Object.entries(review.coverage)) {
      const label = LABELS[kind], refs = coverage.dates.flatMap(day => day.refs);
      coverageCard.append(p(`${label}: ${coverage.status === 'unavailable' ? 'Chưa đọc được' : !coverage.eligibleDays ? 'Khoảng này chưa có ngày đến hạn' : `${coverage.recordedDays}/${coverage.eligibleDays} ngày đến hạn`}`, 'summary'),
        p(`Cơ sở: ${coverage.eligibleDays} ngày đến hạn trong ${coverage.calendarDays} ngày của tháng${period.relation === 'current' ? ', tính đến hôm nay' : ''}.`, 'hint'),
        evidence(`${label} · ngày có ghi`, refs, `coverage:${kind}`, coverage.status === 'available' ? period.eligibleDates.filter(date => !coverage.dates.some(day => day.date === date)) : []));
    }
    coverageCard.append(p('Chưa xác nhận đã ghi đủ ngày.', 'hint'));
    const countsCard = panel(heading('Bản ghi trong tháng', 'counts')); host.append(countsCard);
    for (const [kind, count] of Object.entries(review.counts)) countsCard.append(p(`${LABELS[kind]}: ${count.state === 'known' ? `${fmt(count.value)} bản ghi trong tháng` : 'Chưa đọc được'}`, 'summary'), evidence(`${LABELS[kind]} · bản ghi trong tháng`, count.refs, `counts:${kind}`));
    const timeline = node('ol', { class: 'month-memory-timeline' }); host.append(panel(heading('Dòng thời gian', 'timeline'), timeline));
    for (const day of review.timeline) {
      const title = heading(day.date, `date:${day.date}`, true); dateHeadings.set(day.date, title);
      const dayRoot = node('li', { 'data-memory-date': day.date }, [title, dayButton(day.date, ':timeline')]);
      if (day.temporalState === 'future') dayRoot.append(p('Bản ghi có ngày sau hôm nay · chưa tính vào ngày đến hạn.', 'hint'));
      for (const group of day.groups) {
        const list = node('ol', { class: 'month-memory-items' }); dayRoot.append(h3(LABELS[group.kind]), list);
        for (const { ref, preview: saved } of group.items) {
          const card = mark(node('li', { 'data-memory-kind': ref.kind, 'data-memory-id': ref.id, 'data-memory-date': ref.date, tabindex: '-1' }, preview(group.kind, saved)), `item:${refKey(ref)}`);
          cards.set(refKey(ref), card); card.append(sourceButton(ref));
          if (ref.kind === 'photo') {
            const opener = photoAction('Mở ảnh', 'thumbnail', ref, () => openPhoto(ref, opener)); card.append(opener);
          }
          list.append(card);
        }
      }
      timeline.append(dayRoot);
    }
    for (const { domain } of review.unavailableDomains) {
      const message = p(domain === 'photos' ? 'Chưa đọc được kho ảnh; các bản ghi khác vẫn hiển thị.' : `Chưa đọc được ${LABELS[domain]}.`, 'notice');
      message.setAttribute('role', 'status'); host.append(message);
    }
  }
  async function renderView(options = {}) {
    returnFocusCleanup?.(); returnFocusCleanup = null;
    const request = ++generation, restore = pendingReturn; pendingReturn = null;
    const capturedToday = options.capturedToday ?? today();
    try { period = lifeReviewPeriod('month', anchor ?? capturedToday, capturedToday); anchor = period.anchor; }
    catch {
      if (host?.isConnected) { showInputError('Khoảng ngày ngoài phạm vi hỗ trợ hoặc ngày hiện tại không hợp lệ.'); return; }
      host = panel(heading('Ký ức tháng', 'period'), p('Khoảng ngày ngoài phạm vi hỗ trợ hoặc ngày hiện tại không hợp lệ.', 'notice')); main.append(host); return;
    }
    closeViewer(); host?.remove(); host = div('month-memories'); main.append(host); const activeHost = host;
    focusItems = new Map(); dateHeadings = new Map(); cards = new Map(); header();
    const restoringControl = restore?.focusKey?.startsWith('control:'); if (restoringControl) restoreReturn(restore);
    let focusMoved = false;
    const doc = main.ownerDocument;
    // Root show() focuses main synchronously. Any other focus destination while
    // Back is awaiting metadata belongs to the user, including sibling nav.
    const observeFocus = event => { if (event.target !== main && event.target !== doc?.body) focusMoved = true; };
    const stopObservingFocus = () => {
      doc?.removeEventListener?.('focusin', observeFocus);
      if (returnFocusCleanup === stopObservingFocus) returnFocusCleanup = null;
    };
    if (restore && !restoringControl) { doc?.addEventListener?.('focusin', observeFocus); returnFocusCleanup = stopObservingFocus; }
    const status = p('Đang đọc dữ liệu và metadata ảnh…', 'hint'); status.setAttribute('role', 'status'); host.append(status);
    let dataRead;
    try { dataRead = structuredClone(readData()); } catch { dataRead = { status: 'unavailable', reason: safeReason('canonical-load-error') }; }
    let photoRead;
    try { photoRead = { status: 'available', records: await readMetadata() }; } catch { photoRead = { status: 'unavailable', reason: safeReason('photo-read-error') }; }
    stopObservingFocus();
    if (request !== generation || !activeHost.isConnected) return;
    status.remove(); summary(deriveMonthMemories(dataRead, photoRead, anchor, capturedToday));
    if (!restoringControl && !focusMoved && !activeHostContains(active())) restoreReturn(restore);
  }
  function activeHostContains(item) { for (let current = item; current; current = current.parentNode) if (current === host) return true; return false; }
  return { renderView, invalidate, returnTo, getContext, select };
}
