const groups = {
  dashboard: 'today',
  program: 'training',
  workout: 'training',
  history: 'training',
  'gym-logs': 'training',
  nutrition: 'food',
  journal: 'journal',
  checkins: 'progress',
  settings: 'settings'
};

export function navigationGroup(view) {
  return groups[view] ?? null;
}
