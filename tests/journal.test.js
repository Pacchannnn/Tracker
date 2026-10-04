import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJournal, monthDays } from '../js/journal.js';
import * as journal from '../js/journal.js';

test('daily journal accepts a quick mood or note and cleans custom tags', () => {
  assert.deepEqual(validateJournal({ date: '2026-09-30', mood: 'steady', title: '', note: '', tags: 'Gym, Study, Gym' }),
    { date: '2026-09-30', mood: 'steady', title: '', note: '', tags: ['Gym', 'Study'] });
  assert.throws(() => validateJournal({ date: '2026-09-30', mood: '', title: '', note: '', tags: '' }));
  assert.throws(() => validateJournal({ date: '2026-02-30', mood: 'steady', tags: '' }));
  assert.throws(() => validateJournal({ date: '2026-09-30', mood: 'bean', tags: '' }));
});

test('calendar month includes offset and real days without fabricated entries', () => {
  const days = monthDays(2026, 9);
  assert.equal(days[0], null);
  assert.equal(days[1], '2026-09-01');
  assert.equal(days.at(-1), '2026-09-30');
});

test('journal suggestions follow recent dates and deduplicate tags without rewriting history', () => {
  const entries = [{ date: '2026-09-01', tags: ['Gym', 'Old'] }, { date: '2026-10-03', tags: ['Đọc', 'gym'] }, { date: '2026-10-02', tags: ['Cooking', 'ĐỌC'] }];
  const before = structuredClone(entries);
  assert.deepEqual(journal.recentJournalTags(entries, 3), ['Đọc', 'gym', 'Cooking']);
  assert.deepEqual(journal.recentJournalTags([]), []);
  assert.deepEqual(entries, before);
});

test('journal tag toggle adds or removes a whole tag with case-insensitive matching', () => {
  assert.equal(journal.toggleJournalTag(' Gym, Đọc, gym ', 'GYM'), 'Đọc');
  assert.equal(journal.toggleJournalTag('Gym', 'Đọc'), 'Gym, Đọc');
  assert.equal(journal.toggleJournalTag('Gymnastics', 'Gym'), 'Gymnastics, Gym');
  assert.equal(journal.toggleJournalTag('', 'Đọc'), 'Đọc');
  const twenty = Array.from({ length: 20 }, (_, i) => `Tag ${i}`).join(', ');
  assert.throws(() => journal.toggleJournalTag(twenty, 'extra'));
  assert.throws(() => journal.toggleJournalTag('', 'x'.repeat(41)));
  assert.equal(journal.toggleJournalTag(twenty, 'Tag 0').split(', ').length, 19);
});
