import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationGroup } from '../js/navigation.js';

test('every existing view selects its matching primary navigation section', () => {
  assert.equal(navigationGroup('dashboard'), 'today');
  assert.equal(navigationGroup('program'), 'training');
  assert.equal(navigationGroup('workout'), 'training');
  assert.equal(navigationGroup('history'), 'training');
  assert.equal(navigationGroup('gym-logs'), 'training');
  assert.equal(navigationGroup('nutrition'), 'food');
  assert.equal(navigationGroup('journal'), 'journal');
  assert.equal(navigationGroup('checkins'), 'progress');
  assert.equal(navigationGroup('settings'), 'settings');
});
