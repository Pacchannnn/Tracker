import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJournal, monthDays } from '../js/journal.js';

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
