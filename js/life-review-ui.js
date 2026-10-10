import { deriveLifeWeek, lifeReviewPeriod } from './life-review.js?v=41';
import { localDate, validDate } from './data.js?v=41';
import { MOODS } from './journal.js?v=41';
import { listPhotoMetadata } from './photo-store.js?v=41';

const LABELS = { journal: 'Nhật ký', mood: 'Tâm trạng', nutrition: 'Dinh dưỡng', workout: 'Tập luyện', cardio: 'Cardio', checkin: 'Check-in', knee: 'Gối', photos: 'Ảnh', photo: 'Ảnh', set: 'Hiệp đã lưu' };
const MACROS = { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

export function createLifeReviewUI({ main, helpers, readData, readMetadata = listPhotoMetadata,
  today = localDate, openSource, openDay }) {
  const { node, button, field, panel, div, p, h2, h3, fmt } = helpers;
  let anchor = null, generation = 0, host = null, period = null, inputError = '', pendingReturn = null;
  let focusItems = new Map(), headings = new Map(), evidenceRows = new Map();
  const win = () => main.ownerDocument?.defaultView;
  const refKey = ref => JSON.stringify(ref);
  const safeReason = code => ({ code, message: code === 'photo-read-error' ? 'Chưa đọc được kho ảnh' : 'Chưa đọc được dữ liệu JSON' });
  function control(label, action, name) {
    const item = button(label, action); item.style.minHeight = '48px'; item.style.whiteSpace = 'normal';
    if (name) { item.name = name; item.setAttribute('name', name); marked(item, `control:${name}`); }
    return item;
  }
  function marked(item, key) { item.setAttribute('data-life-focus', key); focusItems.set(key, item); return item; }
  function heading(title, key, sub = false) {
    const item = (sub ? h3 : h2)(title); item.setAttribute('tabindex', '-1');
    marked(item, `metric:${key}`); headings.set(key, item); return item;
  }
  function getContext(metricKey = 'period', ref = null, focusKey = null) {
    return { mode: 'week', weekAnchor: anchor, originatingMetric: metricKey, metricKey,
      originatingRef: ref ? { ...ref } : null,
      focusKey: focusKey || main.ownerDocument?.activeElement?.getAttribute?.('data-life-focus') || `metric:${metricKey}`,
      scrollPosition: win()?.scrollY ?? 0 };
  }
  function sourceButton(ref, metricKey, suffix = '') {
    const key = `source:${metricKey}:${refKey(ref)}${suffix}`;
    const ownership = ref.kind === 'set' ? ` · buổi ${ref.sessionId} · ${ref.slotId != null ? `slot ${ref.slotId}` : `chỉ số ${ref.legacyIndex}`}` : '';
    const label = `${LABELS[ref.kind] || ref.kind} · ${ref.kind} · ${ref.date}${ref.id != null ? ` · ID ${ref.id}` : ''}${ownership}`;
    return marked(control(`Mở ${label}`, () => openSource({ ...ref }, getContext(metricKey, ref, key))), key);
  }
  function dayButton(date, metricKey, suffix = '') {
    const ref = { kind: 'day', date }, key = `source:${metricKey}:${refKey(ref)}${suffix}`;
    return marked(control(`Xem ngày · ${date}`, () => openDay(date, getContext(metricKey, ref, key))), key);
  }
  function evidence(metricKey, label, refs = [], dates = null) {
    const rowLabel = JSON.stringify([metricKey, label]);
    const ordinal = evidenceRows.get(rowLabel) ?? 0; evidenceRows.set(rowLabel, ordinal + 1);
    const rowKey = `:evidence:${rowLabel}:${ordinal}`;
    const details = node('details', { class: 'life-review-sources' }, [node('summary', { text: `Xem bản ghi · ${label}` })]);
    const list = node('ol');
    refs.forEach((ref, index) => list.append(node('li', {}, [ref.kind === 'day' ? dayButton(ref.date, metricKey, `${rowKey}:${index}`) : sourceButton(ref, metricKey, `${rowKey}:${index}`)])));
    if (!refs.length) {
      details.append(p('Chưa có bản ghi đóng góp cho mục này.', 'hint'));
      for (const date of dates ?? period.eligibleDates) list.append(node('li', {}, [dayButton(date, metricKey, rowKey)]));
    }
    details.append(list); return details;
  }
  const flattenDates = coverage => coverage.dates.flatMap(item => item.refs);
  function unavailable(title, reason) {
    const message = p(`Chưa đọc được ${title}${reason?.message ? ` · ${reason.message}` : ''}`, 'notice');
    message.setAttribute('role', 'status'); return message;
  }
  function valueText(value) {
    if (value.state === 'known') return `${fmt(value.value)}${value.unit === 'count' ? '' : ` ${value.unit}`}`;
    return ({ missing: 'Chưa có bản ghi', unknown: 'Chưa rõ', unavailable: 'Chưa đọc được số liệu' })[value.state];
  }
  function countRow(card, label, count, key) {
    card.append(p(`${label}: ${count.state === 'known' ? fmt(count.value) : 'Chưa đọc được'}`, 'summary'), evidence(key, label, count.refs));
  }
  function valueRow(card, label, value, key) {
    card.append(p(`${label}: ${valueText(value)}`, 'summary'), evidence(key, label, value.refs));
  }
  function domainCard(title, key, domain, renderValue) {
    const card = panel(heading(title, key)); host.append(card);
    if (domain.status === 'unavailable') card.append(unavailable(title, domain.reason));
    else renderValue(card, domain.value);
    return card;
  }
  function showInputError(message) {
    inputError = message;
    const input = host?.querySelector('[name="lifeReviewDate"]');
    input?.setAttribute('aria-invalid', message ? 'true' : 'false');
    const error = focusItems.get('period-error'); if (error) error.textContent = message;
  }
  function select(date, capturedToday = today()) {
    try {
      const selected = lifeReviewPeriod('week', date, capturedToday);
      preserveControlFocus();
      anchor = selected.anchor; inputError = ''; renderView({ capturedToday }); return true;
    } catch {
      showInputError(validDate(date) ? 'Khoảng ngày ngoài phạm vi hỗ trợ' : 'Ngày muốn xem không hợp lệ. Chọn ngày hợp lệ.'); return false;
    }
  }
  function returnTo(context) {
    if (context?.weekAnchor) anchor = context.weekAnchor;
    pendingReturn = context ? { ...context } : null; inputError = '';
  }
  function preserveControlFocus() {
    const active = main.ownerDocument?.activeElement, key = active?.getAttribute?.('data-life-focus');
    if (key?.startsWith('control:') && focusItems.get(key) === active) pendingReturn = getContext('period', null, key);
  }
  function invalidate() { generation++; host = null; focusItems = new Map(); headings = new Map(); evidenceRows = new Map(); }
  function restoreReturn(context) {
    if (!context) return;
    const target = focusItems.get(context.focusKey) || headings.get(context.metricKey || context.originatingMetric) || headings.get('period');
    // A source may live in a folded provenance list. Expand ancestors before focus.
    for (let parent = target?.parentNode; parent && parent !== host; parent = parent.parentNode) {
      if (parent.tagName?.toLowerCase() === 'details') parent.open = true;
    }
    if (Number.isFinite(context.scrollPosition)) win()?.scrollTo?.({ top: context.scrollPosition });
    target?.focus({ preventScroll: true });
    const bounds = target?.getBoundingClientRect?.();
    const navBounds = main.ownerDocument?.querySelector?.('.mobile-nav')?.getBoundingClientRect?.();
    const visibleBottom = navBounds?.height > 0 ? navBounds.top : win()?.innerHeight;
    if (bounds && (bounds.top < 0 || (Number.isFinite(visibleBottom) && bounds.bottom > visibleBottom))) target.scrollIntoView?.({ block: 'center' });
  }
  function header() {
    const selector = field('Ngày trong tuần muốn xem', 'lifeReviewDate', anchor, { type: 'date', required: true });
    const input = selector.querySelector('input'); input.setAttribute('aria-describedby', 'life-review-period-error');
    marked(input, 'control:lifeReviewDate');
    input.setAttribute('aria-invalid', inputError ? 'true' : 'false');
    input.addEventListener('change', () => select(input.value));
    input.addEventListener('input', () => showInputError(''));
    const error = p(inputError, 'notice'); error.setAttribute('id', 'life-review-period-error'); error.setAttribute('role', 'alert'); focusItems.set('period-error', error);
    const nav = (label, key, name) => {
      const item = control(label, () => select(period[key]), name); item.disabled = period[key] == null; return item;
    };
    const current = control('Tuần hiện tại', () => { const capturedToday = today(); select(capturedToday, capturedToday); }, 'lifeReviewCurrent');
    current.disabled = period.currentAnchor == null;
    host.append(panel(heading('Tuần đã ghi', 'period'), p(`${period.start} → ${period.end}`, 'summary'),
      p(`Tính đến ${period.today} · ${period.calendarDays} ngày trong lịch · ${period.eligibleDays} ngày đến hạn`, 'hint'),
      selector, error, div('actions', nav('← Tuần trước', 'previousAnchor', 'lifeReviewPrevious'), nav('Tuần sau →', 'nextAnchor', 'lifeReviewNext'),
        current, control('Làm mới', () => { preserveControlFocus(); renderView(); }, 'lifeReviewRefresh'))));
  }
  function summary(review) {
    if (review.empty === true) host.append(p('Chưa có dữ liệu được ghi trong khoảng này', 'empty'));
    else if (review.empty === null) host.append(p('Chưa xác định khoảng này có trống hay không vì có nguồn chưa đọc được.', 'notice'));
    if (review.photos.status === 'unavailable') {
      const error = p('Chưa đọc được kho ảnh; các bản ghi khác vẫn hiển thị.', 'notice'); error.setAttribute('role', 'status'); host.append(error);
    }
    host.append(p('Chưa xác nhận đã ghi đủ ngày. Số liệu phản ánh các bản ghi đã lưu.', 'hint'));
    const coverage = panel(heading('Ngày có bản ghi', 'coverage')); host.append(coverage);
    for (const [key, item] of Object.entries(review.coverage)) {
      const metric = `coverage-${key}`, row = div('life-review-record', heading(LABELS[key], metric, true));
      if (item.status === 'unavailable') row.append(unavailable(LABELS[key], item.reason));
      else row.append(p(item.eligibleDays ? `${item.recordedDays}/${item.eligibleDays} ngày${period.relation === 'current' ? ' tính đến hôm nay' : ' trong tuần'}` : 'Khoảng này chưa có ngày đến hạn', 'summary'),
        evidence(metric, LABELS[key], flattenDates(item)));
      coverage.append(row);
    }
    domainCard('Nhật ký', 'journal', review.journal, (card, value) => countRow(card, 'Bản ghi nhật ký', value.recordCount, 'journal'));
    domainCard('Tâm trạng đã ghi', 'moods', review.moods, (card, moods) => {
      const refs = moods.buckets.flatMap(item => item.refs);
      card.append(p(`${moods.knownDays} ngày có tâm trạng rõ`, 'summary'), evidence('moods', 'Ngày có tâm trạng rõ', refs));
      if (!moods.knownDays) card.append(p('Chưa có tâm trạng được ghi', 'hint'));
      for (const mood of MOODS) {
        const bucket = moods.buckets.find(item => item.id === mood.value);
        card.append(p(`${mood.mark} ${mood.label}: ${moods.knownDays ? `${bucket.count}/${bucket.denominator} ngày có tâm trạng rõ` : 'Chưa có tâm trạng được ghi'}`, 'summary'),
          evidence('moods', mood.label, bucket.refs));
      }
      const journalDates = new Set(review.coverage.journal.dates.map(item => item.date));
      const absentJournalDates = period.eligibleDates.filter(date => !journalDates.has(date));
      card.append(p(`${moods.missingMoodJournalDays} ngày nhật ký chưa ghi tâm trạng`, 'hint'), evidence('moods', 'Nhật ký chưa ghi tâm trạng', moods.missingMoodSources),
        p(`${moods.unrecordedEligibleDays} ngày đến hạn chưa có nhật ký`, 'hint'), evidence('moods', 'Ngày chưa có nhật ký', [], absentJournalDates));
    });
    domainCard('Thẻ hoạt động do bạn ghi', 'tags', review.tags, (card, tags) => {
      card.append(p('Đây là nhãn bạn lưu trong nhật ký. Một ngày có thể có nhiều thẻ.', 'hint'), p(`${tags.tagDays} ngày có thẻ`, 'summary'),
        evidence('tags', 'Ngày có thẻ', tags.buckets.flatMap(item => item.refs)));
      if (!tags.buckets.length) card.append(p('Chưa có thẻ được ghi', 'hint'));
      for (const bucket of tags.buckets) card.append(p(`${bucket.label}: ${bucket.dayCount}/${bucket.denominator} ngày có thẻ`, 'summary'), evidence('tags', bucket.label, bucket.refs));
    });
    domainCard('Tập luyện lưu trong lịch sử', 'workouts', review.workouts, (card, workouts) => {
      countRow(card, 'Buổi lưu trong lịch sử', workouts.sessionCount, 'workouts'); countRow(card, 'Hiệp đã lưu', workouts.savedSetCount, 'workouts');
      valueRow(card, 'Lượt bài có hiệp đã lưu', workouts.performedOccurrenceCount, 'workouts');
      countRow(card, 'Lượt bài có chủ sở hữu rõ', workouts.provenOccurrenceCount, 'workouts');
      countRow(card, 'Hiệp chưa rõ chủ sở hữu', workouts.unresolvedSetCount, 'workouts');
      const muscle = workouts.muscleEvidence;
      card.append(p(muscle.state === 'missing' ? 'Chưa có bản ghi về nhóm cơ' : `Nhóm cơ không lưu trong snapshot: ${muscle.unknownProvenCount} lượt bài chưa xác định · Không xác định`, 'hint'),
        p(`Cơ sở lượt bài: ${muscle.denominator == null ? 'Chưa rõ' : muscle.denominator}`, 'hint'),
        evidence('workouts', 'Nhóm cơ không xác định', muscle.buckets.flatMap(item => item.refs)));
      const list = node('ol');
      for (const session of workouts.sessions) list.append(node('li', {}, [h3(session.title), sourceButton(session.ref, 'workouts'), evidence('workouts', `Hiệp của buổi ${session.ref.id}`, session.setRefs)]));
      card.append(list);
    });
    domainCard('Dinh dưỡng đã ghi', 'nutrition', review.nutrition, (card, nutrition) => {
      countRow(card, 'Món đã lưu', nutrition.entryCount, 'nutrition');
      card.append(p(`${nutrition.loggedDays} ngày có ghi dinh dưỡng`, 'hint'), evidence('nutrition', 'Ngày có ghi dinh dưỡng', nutrition.days.flatMap(item => item.entryRefs)));
      for (const [key, macro] of Object.entries(nutrition.macros)) {
        card.append(heading(MACROS[key], `nutrition-${key}`, true));
        valueRow(card, `Tổng ${MACROS[key]} đã ghi`, macro.fullTotal, `nutrition-${key}`);
        valueRow(card, `Tổng phần có số liệu rõ của ${MACROS[key]}`, macro.knownSubtotal, `nutrition-${key}`);
        valueRow(card, `Trung bình ${MACROS[key]} trên ${macro.knownDays} ngày có số liệu rõ, trong ${macro.loggedDays} ngày có ghi`, macro.knownDayAverage, `nutrition-${key}`);
        const dayRefs = dates => nutrition.days.filter(item => dates.includes(item.date)).flatMap(item => item.entryRefs);
        card.append(p(`${macro.unknownDays} ngày có ghi nhưng chưa rõ ${MACROS[key]}`, 'hint'), evidence(`nutrition-${key}`, `Ngày chưa rõ ${MACROS[key]}`, dayRefs(macro.unknownDates)),
          p(`${macro.unavailableDays} ngày có số liệu ${MACROS[key]} chưa đọc được`, 'hint'), evidence(`nutrition-${key}`, `Ngày chưa đọc được ${MACROS[key]}`, dayRefs(macro.unavailableDates)));
      }
      const days = node('ol');
      for (const day of nutrition.days) days.append(node('li', {}, [h3(day.date), p(`Bữa đã lưu: ${day.mealLabels.join(' · ')}`, 'hint'), evidence('nutrition', `Món ngày ${day.date}`, day.entryRefs)]));
      card.append(days);
    });
    const secondary = node('details', {}, [node('summary', { text: 'Cardio · Check-in · Gối · Ảnh' })]); host.append(panel(secondary));
    const addSecondary = (title, key, domain, render) => { const card = domainCard(title, key, domain, render); secondary.append(card); };
    addSecondary('Cardio', 'cardio', review.cardio, (card, value) => { countRow(card, 'Bản ghi cardio', value.recordCount, 'cardio'); valueRow(card, 'Phút cardio đã ghi', value.minutes, 'cardio'); });
    addSecondary('Check-in', 'checkins', review.checkins, (card, value) => countRow(card, 'Bản ghi check-in', value.recordCount, 'checkins'));
    addSecondary('Gối', 'knees', review.knees, (card, value) => countRow(card, 'Bản ghi gối', value.recordCount, 'knees'));
    addSecondary('Ảnh · metadata', 'photos', review.photos, (card, value) => { countRow(card, 'Ảnh có metadata', value.photoCount, 'photos'); card.append(p(`${value.photoDays} ngày có metadata ảnh`, 'hint'), evidence('photos', 'Ngày có metadata ảnh', value.photoCount.refs)); });
    const dates = panel(heading('Ngày có bản ghi nguồn', 'sourceDays')); host.append(dates);
    if (review.unavailableDomains.length) dates.append(p('Danh sách nguồn chưa đầy đủ vì có nguồn chưa đọc được.', 'notice'));
    const list = node('ol');
    for (const day of review.sourceDays) list.append(node('li', {}, [h3(day.date), dayButton(day.date, 'sourceDays'), evidence('sourceDays', day.date, day.refs)]));
    dates.append(list);
    const future = panel(heading('Bản ghi có ngày sau hôm nay', 'future')); host.append(future);
    future.append(p('Các bản ghi này nằm trong tuần đã chọn và chưa được tính vào số liệu đến hạn.', 'hint'));
    for (const [key, domain] of Object.entries(review.futureRecords)) {
      if (domain.status === 'unavailable') future.append(unavailable(LABELS[key], domain.reason));
      else countRow(future, `${LABELS[key]} · bản ghi sau hôm nay`, domain.value.recordCount, 'future');
    }
  }
  async function renderView(options = {}) {
    const request = ++generation, restore = pendingReturn; pendingReturn = null;
    const capturedToday = options.capturedToday ?? today();
    try { period = lifeReviewPeriod('week', anchor ?? capturedToday, capturedToday); anchor = period.anchor; }
    catch {
      if (host?.isConnected) { showInputError('Khoảng ngày ngoài phạm vi hỗ trợ hoặc ngày hiện tại không hợp lệ.'); return; }
      host = panel(h2('Tuần đã ghi'), unavailable('khoảng ngày', null)); main.append(host); return;
    }
    host?.remove(); host = div('life-review'); main.append(host); const activeHost = host;
    focusItems = new Map(); headings = new Map(); evidenceRows = new Map(); header();
    const restoringControl = restore?.focusKey?.startsWith('control:');
    if (restoringControl) restoreReturn(restore);
    const status = p('Đang đọc dữ liệu và metadata ảnh…', 'hint'); status.setAttribute('role', 'status'); host.append(status);
    let dataRead;
    try { dataRead = structuredClone(readData()); }
    catch { dataRead = { status: 'unavailable', reason: safeReason('canonical-load-error') }; }
    let photoRead;
    try { photoRead = { status: 'available', records: await readMetadata() }; }
    catch { photoRead = { status: 'unavailable', reason: safeReason('photo-read-error') }; }
    if (request !== generation || !activeHost.isConnected) return;
    status.remove(); summary(deriveLifeWeek(dataRead, photoRead, anchor, capturedToday));
    if (!restoringControl) restoreReturn(restore);
  }
  return { renderView, invalidate, returnTo, getContext, select, setAnchor: select };
}
