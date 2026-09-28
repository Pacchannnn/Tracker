const groups = {
  dashboard: 'today',
  program: 'training',
  workout: 'training',
  history: 'training',
  nutrition: 'food',
  checkins: 'progress',
  settings: 'settings'
};

export function navigationGroup(view) {
  return groups[view] ?? null;
}
