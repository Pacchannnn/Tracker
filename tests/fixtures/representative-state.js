import { emptyData } from '../../js/data.js';
import { libraryExercises, defaultSlot, snapshotWorkout } from '../../js/custom-workout.js';
import { plannerPayload } from '../../js/planning-draft.js';
import { createPlannerRequest, suggestWorkout } from '../../js/planner.js';

// Synthetic data only. These numbers are fixtures, not food or health claims.
export function representativeState() {
  const data = emptyData(), now = '2026-10-04T10:00:00.000Z', date = '2026-10-04';
  data.settings = { week: 4, calories: 2100, protein: 125 };
  data.customExercises = [{ id: 'custom-fixture', name: 'Fixture row', primaryMuscles: ['back'], secondaryMuscles: [], movementPattern: 'horizontal-pull', equipment: ['cable'], notes: 'fixture', isCustom: true, archived: false, createdAt: now, updatedAt: now }];
  const day = { id: 'fixture-day', name: 'Fixture day', exercises: libraryExercises(data.customExercises).slice(0, 3).map((exercise, index) => defaultSlot(exercise, () => `slot-${index}`)) };
  const plan = { id: 'fixture-plan', name: 'Fixture plan', days: [day], createdAt: now, updatedAt: now };
  data.plans = [plan]; data.activePlanId = plan.id;
  const session = { id: 'fixture-session', workout: 'CUSTOM', workoutSnapshot: snapshotWorkout(day, plan), date, week: 4, notes: 'history', updatedAt: now,
    sets: [{ id: 'fixture-set', exerciseIndex: 0, exerciseId: day.exercises[0].exerciseId, exerciseName: day.exercises[0].name, setNumber: 1, weight: 12, unit: 'kg', reps: 10, rir: 2 }] };
  data.sessions = [session]; data.draft = { ...structuredClone(session), id: 'fixture-live', sets: [] };
  const food = { name: 'Fixture food', serving: '1 fixture', calories: 100, protein: 8, carbs: 12, fat: 3, notes: 'synthetic' };
  data.foods = [{ id: 'fixture-food', ...food, calories: 200 }];
  data.entries = [{ id: 'fixture-entry', date, meal: 'Lunch', servings: 1.5, foodId: 'fixture-food', food: structuredClone(food) }];
  data.savedMeals = [{ id: 'fixture-meal', name: 'Fixture meal', items: [{ foodId: 'fixture-food', food: structuredClone(food), servings: 2 }] }];
  data.recipes = [{ id: 'fixture-recipe', name: 'Fixture recipe', description: 'synthetic', servings: 2, ingredients: [{ name: 'Fixture ingredient', unit: 'g', quantity: 100 }], steps: ['Fixture step'], tags: ['fixture'], notes: '', nutritionPerServing: { calories: 300, protein: 20, carbs: 30, fat: 10 } }];
  data.journalEntries = [{ id: 'fixture-journal', date, mood: 'steady', title: 'Fixture diary', note: 'synthetic only', tags: ['Fixture'], createdAt: now, updatedAt: now }];
  data.checkins = [{ id: 'fixture-checkin', date, weight: 70, waist: 80, sleep: 7, knee: '', notes: 'fixture' }];
  data.cardioEntries = [{ id: 'fixture-cardio', date, activity: 'Fixture walk', durationMinutes: 20, distanceKm: null, intensity: '', notes: '' }];
  data.kneeEntries = [{ id: 'fixture-knee', date, moment: 'after', pain: null, swelling: 'unknown', instability: 'unknown', stiffness: 'unknown', notes: 'fixture record' }];
  data.exerciseNotes = { 'A:0': 'Fixture seat' };
  const preferences = { name: 'Fixture planner', muscles: ['back'], equipment: [], include: [], exclude: [], count: '3', sets: '2', repMin: '8', repMax: '12', targetRIR: '2', restSeconds: '90', workSeconds: '40', minutes: '', goal: '', priorities: '', notes: '', healthRestrictions: '' };
  let index = 0; const result = suggestWorkout(createPlannerRequest(preferences), libraryExercises(data.customExercises), () => `planner-${index++}`);
  data.planningDraft = { revision: 3,
    builder: { savedAt: now, payload: { day: { ...structuredClone(day), id: 'fixture-one-off', name: 'Fixture unsaved builder' }, source: null } },
    planner: { savedAt: now, payload: plannerPayload(preferences, result, preferences) } };
  return data;
}
