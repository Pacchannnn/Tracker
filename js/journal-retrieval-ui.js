import { MOODS, normalizeJournalText, journalTagOptions, retrieveJournalEntries } from './journal.js?v=34';

export function createJournalRetrievalUI({ main, getEntries, openEntry, helpers }) {
  const { node, button, panel, div, p, h2, h3, field } = helpers;
  const state = { query: '', tags: [], limit: 30 };
  let searchInput;
  function renderTimeline() {
    const timeline = panel(h2('Dòng thời gian')); timeline.classList.add('journal-retrieval'); main.append(timeline);
    const search = field('Tìm nhật ký', 'journalSearch', state.query, { type: 'search' });
    searchInput = search.querySelector('input');
    searchInput.setAttribute('placeholder', 'Tiêu đề, ghi chú hoặc thẻ');
    const clear = button('Xóa bộ lọc', () => {
      state.query = ''; state.tags = []; state.limit = 30; searchInput.value = ''; updateResults(); searchInput.focus();
    });
    const active = p('', 'hint'), count = p('', 'hint'); count.setAttribute('role', 'status');
    const controls = div('journal-retrieval-controls', search, clear);
    const choices = node('fieldset', { class: 'journal-retrieval-tags' }, [node('legend', { text: 'Lọc theo thẻ · phải có tất cả thẻ đã chọn' })]);
    const chips = div('tag-suggestions'), chipButtons = new Map(), results = div('journal-results'), moreHost = div('actions');
    timeline.append(controls, choices, active, count, results, moreHost);
    let options;
    try { options = journalTagOptions(getEntries()); }
    catch (error) { timeline.append(p(error.message, 'notice error')); controls.hidden = choices.hidden = true; return; }
    // Keep a formerly existing selected tag removable after its last source entry was edited/deleted.
    const optionsByKey = new Map([...options, ...state.tags].map(tag => [normalizeJournalText(tag), tag]));
    const sourceKeys = new Set(options.map(normalizeJournalText));
    for (const [key, tag] of optionsByKey) {
      const chip = button(tag, () => {
        state.tags = state.tags.some(item => normalizeJournalText(item) === key)
          ? state.tags.filter(item => normalizeJournalText(item) !== key) : [...state.tags, tag];
        state.limit = 30; updateResults();
        if (chip.isConnected) chip.focus({ preventScroll: true });
        else searchInput.focus();
      });
      chipButtons.set(key, chip); chips.append(chip);
    }
    if (!chipButtons.size) choices.append(p('Chưa có thẻ trong nhật ký.', 'hint'));
    choices.append(chips);
    searchInput.addEventListener('input', () => { state.query = searchInput.value; state.limit = 30; updateResults(); });
    function updateResults() {
      results.replaceChildren(); moreHost.replaceChildren();
      for (const [key, chip] of chipButtons) {
        const selected = state.tags.some(tag => normalizeJournalText(tag) === key);
        if (!sourceKeys.has(key) && !selected) { chip.remove(); chipButtons.delete(key); }
        else chip.setAttribute('aria-pressed', String(selected));
      }
      const filtering = !!normalizeJournalText(state.query) || !!state.tags.length;
      clear.disabled = !filtering;
      active.textContent = filtering ? [normalizeJournalText(state.query) ? `Tìm: “${state.query.trim()}”` : '', state.tags.length ? `Thẻ (tất cả): ${state.tags.join(' · ')}` : ''].filter(Boolean).join(' · ') : 'Đang xem toàn bộ nhật ký · ngày mới trước.';
      let page;
      try { page = retrieveJournalEntries(getEntries(), state); }
      catch (error) { count.textContent = ''; results.append(p(error.message, 'notice error')); return; }
      count.textContent = `Hiển thị ${page.entries.length} / ${page.total} nhật ký`;
      if (!page.total) results.append(p(getEntries().length ? 'Không tìm thấy nhật ký phù hợp' : 'Chưa có nhật ký', 'empty'));
      for (const entry of page.entries) {
        const mood = MOODS.find(item => item.value === entry.mood), open = button('Mở ngày', () => openEntry(entry));
        open.setAttribute('aria-label', `Mở nhật ký ngày ${entry.date}`);
        results.append(div('list-card', h3(`${entry.date}${mood ? ` · ${mood.mark} ${mood.label}` : ''}`),
          entry.title ? p(entry.title, 'summary') : document.createTextNode(''),
          entry.note ? p(entry.note.slice(0,180), 'hint') : document.createTextNode(''),
          entry.tags.length ? p(entry.tags.join(' · '), 'hint') : document.createTextNode(''), open));
      }
      if (page.hasMore) moreHost.append(button('Xem thêm', () => {
        const previousCount = page.entries.length;
        state.limit += 30; updateResults();
        const firstNew = results.querySelectorAll('button')[previousCount];
        if (firstNew) { firstNew.focus({ preventScroll: true }); firstNew.scrollIntoView({ block: 'center' }); }
      }));
    }
    updateResults();
  }
  return { renderTimeline, focusSearch: () => { if (searchInput?.isConnected) searchInput.focus(); } };
}
