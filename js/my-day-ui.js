import { daySummary, readDay, shiftCalendarDate } from './my-day.js?v=31';
import { localDate, validDate } from './data.js?v=31';
import { MOODS } from './journal.js?v=31';
import { PHOTO_CATEGORIES, PHOTO_POSES, listPhotoMetadata, getPhotoThumbnail } from './photo-store.js?v=31';

export function createMyDayUI({ main, getData, render, openSource, registerUrl, helpers,
  readMetadata = listPhotoMetadata, readThumbnail = getPhotoThumbnail }) {
  const { node, button, panel, div, p, h2, h3, field, fmt } = helpers;
  let selectedDate = localDate();
  function select(date, focusName) {
    if (!validDate(date)) return false;
    selectedDate = date; render();
    if (focusName) main.querySelector(`[name="${focusName}"]`)?.focus();
    return true;
  }
  function dateButton(label, name, delta) {
    const control = button(label, () => select(shiftCalendarDate(selectedDate, delta), name));
    control.name = name;
    try { shiftCalendarDate(selectedDate, delta); } catch { control.disabled = true; }
    return control;
  }
  function source(label, kind, recordId) { return button(label, () => openSource(kind, selectedDate, recordId)); }
  function renderView() {
    const date = selectedDate, data = getData(), summary = daySummary(data, [], date);
    const dateField = field('Ngày muốn xem', 'myDayDate', date, { type: 'date', required: true });
    const dateInput = dateField.querySelector('input');
    dateInput.addEventListener('change', () => {
      if (!select(dateInput.value, 'myDayDate')) { dateInput.setCustomValidity('Chọn ngày hợp lệ.'); dateInput.reportValidity(); }
    });
    dateInput.addEventListener('input', () => dateInput.setCustomValidity(''));
    const today = button('Hôm nay', () => select(localDate(), 'myDayToday')); today.name = 'myDayToday';
    main.append(panel(h2(`Xem ngày · ${date}`), p('Hôm đó mình đã ghi những gì?', 'hint'),
      div('my-day-controls', dateField, div('actions', dateButton('← Ngày trước', 'myDayPrevious', -1), dateButton('Ngày sau →', 'myDayNext', 1), today))));
    const cards = div('my-day-cards'); main.append(cards);
    const add = (title, ...children) => { const card = panel(h2(title), ...children); cards.append(card); return card; };
    if (summary.presence.journal) {
      const card = add('Nhật ký');
      for (const entry of summary.journals) {
        const mood = MOODS.find(item => item.value === entry.mood);
        const row = div('my-day-record');
        if (mood) row.append(p(`${mood.mark} ${mood.label}`, 'summary'));
        if (entry.title) row.append(h3(entry.title));
        if (entry.note) row.append(p(`${entry.note.slice(0, 280)}${entry.note.length > 280 ? '…' : ''}`, 'my-day-note'));
        if (entry.tags?.length) row.append(p(entry.tags.join(' · '), 'hint'));
        card.append(row);
      }
      card.append(source('Mở nhật ký', 'journal'));
    }
    if (summary.presence.gym) {
      const card = add('Gym');
      for (const workout of summary.workouts) card.append(div('my-day-record', h3(workout.name),
        p(workout.sourceType, 'hint'), p(`${workout.exerciseCount} bài đã ghi · ${workout.setCount} hiệp đã lưu`, 'summary'),
        p(workout.exerciseNames.join(' · '), 'hint'), workout.notes ? p(workout.notes, 'hint') : document.createTextNode('')));
      card.append(source('Mở lịch sử tập', 'gym'));
    }
    if (summary.presence.cardio) {
      const card = add('Cardio');
      for (const item of summary.cardio) card.append(div('my-day-record', h3(item.activity),
        p(`${fmt(item.durationMinutes)} phút${item.distanceKm != null ? ` · ${fmt(item.distanceKm)} km` : ''}${item.intensity ? ` · ${item.intensity}` : ''}`, 'summary'),
        item.notes ? p(item.notes, 'hint') : document.createTextNode(''), source(`Mở cardio · ${item.activity}`, 'cardio', item.id)));
    }
    if (summary.presence.nutrition) {
      const card = add('Dinh dưỡng', p(`${summary.nutrition.itemCount} món đã ghi · ${summary.nutrition.mealCount} nhóm bữa`, 'hint'));
      const names = { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };
      for (const [key, value] of Object.entries(summary.nutrition.totals)) card.append(p(`${names[key]}: ${value === null ? 'Chưa rõ' : `${fmt(value)} ${key === 'calories' ? 'kcal' : 'g'}`}`, 'summary'));
      card.append(source('Mở dinh dưỡng', 'nutrition'));
    }
    if (summary.presence.checkin) {
      const card = add('Check-in cơ thể');
      for (const item of summary.checkins) {
        const measures = [['weight', 'kg'], ['waist', 'cm eo'], ['sleep', 'giờ ngủ']].filter(([key]) => item[key] != null).map(([key,unit]) => `${fmt(item[key])} ${unit}`);
        card.append(div('my-day-record', p(measures.join(' · ') || 'Ghi chú', 'summary'),
          item.knee ? p(`Gối: ${item.knee}`, 'hint') : document.createTextNode(''),
          item.notes ? p(item.notes, 'hint') : document.createTextNode(''), source('Mở check-in', 'checkin', item.id)));
      }
    }
    if (summary.presence.knee) {
      const details = node('details', {}, [node('summary', { text: `Ghi nhận gối (${summary.knees.length})` }), p('Chỉ ghi chép, không chẩn đoán hoặc xác nhận an toàn.', 'hint')]);
      const status = value => ({ yes: 'Có', no: 'Không', unknown: 'Chưa ghi' })[value] || 'Chưa ghi';
      const moment = value => ({ during: 'Trong buổi tập', after: 'Sau buổi tập', 'next-morning': 'Sáng hôm sau' })[value] || value;
      for (const item of summary.knees) details.append(div('my-day-record', h3(moment(item.moment)),
        p(`Đau: ${item.pain ?? 'Chưa ghi'} · Sưng: ${status(item.swelling)} · Mất vững: ${status(item.instability)} · Cứng: ${status(item.stiffness)}`, 'summary'),
        item.notes ? p(item.notes, 'hint') : document.createTextNode(''), source('Mở ghi nhận gối', 'knee', item.id)));
      add('Gối', details);
    }
    if (!summary.presence.nutrition && !summary.empty) main.append(p('Chưa có bản ghi dinh dưỡng', 'hint'));
    const photoHost = div('my-day-photo-host'); main.append(photoHost);
    const empty = panel(p('Chưa có bản ghi', 'empty'), p('Bạn có thể mở nhật ký hoặc dinh dưỡng của ngày này.', 'hint'),
      div('actions', source('Mở nhật ký', 'journal'), source('Mở dinh dưỡng', 'nutrition')));
    empty.hidden = true;
    if (summary.empty) main.append(empty);
    const photoStatus = p('Đang đọc danh sách ảnh…', 'hint'); photoStatus.setAttribute('role', 'status'); photoHost.append(photoStatus);
    readDay(data, date, readMetadata).then(result => {
      if (!photoHost.isConnected) return;
      photoHost.replaceChildren();
      if (result.photoError) {
        if (empty.isConnected) { empty.hidden = false; empty.replaceChildren(p('Chưa có bản ghi trong dữ liệu nhật ký, tập luyện, dinh dưỡng và check-in.', 'hint')); }
        photoHost.append(p('Chưa đọc được kho ảnh. Các bản ghi khác vẫn hiển thị; có thể còn ảnh của ngày này.', 'notice')); return;
      }
      if (!result.photos.length) { empty.hidden = false; return; }
      empty.remove();
      const strip = div('my-day-photo-strip'), box = panel(h2(`Ảnh (${result.photos.length})`), strip, source('Mở ảnh ngày này', 'photos'));
      photoHost.append(box);
      for (const photo of result.photos) {
        const pose = PHOTO_POSES.find(item => item.value === photo.pose)?.label || photo.pose;
        const label = `Ảnh ${PHOTO_CATEGORIES.find(item => item.value === photo.category)?.label || 'đã lưu'} · ${date}${photo.pose ? ` · ${pose}` : ''}`;
        const figure = node('figure', { class: 'my-day-photo' }, [node('figcaption', { text: label })]); strip.append(figure);
        readThumbnail(photo.id).then(thumbnail => {
          if (!figure.isConnected) return;
          if (!thumbnail) { figure.prepend(p('Chưa có ảnh thu nhỏ', 'hint')); return; }
          const url = URL.createObjectURL(thumbnail); registerUrl(url);
          const image = node('img', { src: url, alt: label, loading: 'lazy' });
          image.addEventListener('error', () => { image.replaceWith(p('Không hiển thị được ảnh thu nhỏ', 'hint')); URL.revokeObjectURL(url); });
          figure.prepend(image);
        }).catch(() => { if (figure.isConnected) figure.prepend(p('Không đọc được ảnh thu nhỏ', 'hint')); });
      }
    });
  }
  return { renderView, date: () => selectedDate };
}
