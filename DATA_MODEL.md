# Local data model (schemaVersion 3)

One JSON object is stored under `vshape-tracker` in `localStorage`.

- `settings`: selected program week (1–12), daily calorie and protein targets. Defaults reflect `MASTER_PLAN.md`; edits affect the app only.
- `draft`: at most one open workout session. Each saved set persists immediately.
- `sessions[]`: completed sessions. `id`, local `date` (`YYYY-MM-DD`), workout key A/B/C/D, `week`, notes, `updatedAt`, and `sets[]`.
- `sets[]`: stable `id`, exercise index/name snapshot, set number, numeric load, unit (`kg` or `lb`), integer reps, numeric RIR. A snapshot keeps history readable if a future program revision changes names.
- `foods[]`: user-entered food name, serving label, calories, protein, carbs, fat, notes. The user supplies the source values.
- `entries[]`: local date, meal category, servings, food ID and a snapshot of food macros. Editing a food does not rewrite prior entries.
- `checkins[]`: local date, optional weight (kg), waist (cm), sleep (hours), knee observation, notes.
- `exerciseNotes`: personal setup text keyed by workout and exercise index (`A:0` etc.). These are separate from the program's technique notes.
- `cardioEntries[]`: date, activity, minutes, optional distance (km), intensity text and notes. No prescription is inferred.
- `kneeEntries[]`: date, moment, optional 0–10 pain, swelling/instability/stiffness status and notes. This is recording only.

IDs use `crypto.randomUUID()`. Calendar dates use local time; timestamps use ISO UTC. Writes take an origin-scoped Web Lock, reload the latest object, apply one change, then save. This prevents two current Tracker tabs from overwriting independent changes. A stale edit to the same record is rejected. If Web Locks are unavailable, writes fail with a clear message rather than claiming to save safely. Older already-open versions of Tracker should be reloaded after updating the code.

The data-safety fixes needed no migration. Phase 3 adds additive migrations: version 1 → 2 adds `exerciseNotes`; version 2 → 3 adds `cardioEntries` and `kneeEntries`. `loadData` migrates in memory without rewriting the original saved object; the next successful user write saves the new schema. Existing sessions, food entries and check-ins are preserved. Entries contain a per-serving food snapshot. Changing an old entry's serving amount keeps that snapshot; choosing a different food creates a new snapshot.

Parse/schema failure stops use of stored data rather than silently overwriting it. Export wraps the state as `{ schemaVersion, exportedAt, data }`; restore also accepts earlier version 1/2 exports and migrates them in memory. Import validates required fields, previews counts, requires an explicit restore action, and checks that live data has not changed since preview. JSON backup includes settings, sessions, draft, foods, entries, check-ins, exercise notes, cardio and knee entries. It does not include photos.

Future Flask/SQLite migration should keep this frontend and replace the persistence boundary in `js/data.js` feature by feature. Map settings first, then sessions/sets, foods/entries, check-ins. Validate and back up the local JSON before any migration; use SQLite foreign keys and parameterized queries. There is no decision yet to start a backend.
