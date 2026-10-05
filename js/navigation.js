const groups = {
  dashboard: 'today', 'my-day': 'today',
  program: 'training',
  'original-program': 'training',
  'exercise-library': 'training',
  plans: 'training',
  builder: 'training',
  planner: 'training',
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
