# Local data model (schemaVersion 6)

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
- `savedMeals[]`: reusable name and item snapshots (`foodId`, per-serving food snapshot, servings). Applying a template creates new independent `entries[]`; editing/deleting a template does not rewrite old days.
- `recipes[]`: name, description, servings, structured ingredient quantities/units/names, ordered steps, tags, notes and optional manually entered complete macro set per serving. Unknown nutrition is `null`. Logging a recipe snapshots its per-serving macros into an entry.
- `journalEntries[]`: one optional daily entry per local date, with stable ID, mood mark, title, note, custom tags, created and updated timestamps. The original mood marks are defined by Tracker, not copied from another product.

Photos live separately in IndexedDB database `tracker-photos`, store `photos`. Each record has a stable ID, date, category (`daily`, `progress`, `gym`, `food`, `other`), optional pose/weight/waist/note, timestamps, JPEG Blob and JPEG thumbnail Blob. Daily photos are associated with a journal date. Deleting that journal entry removes daily photos for the same date; other categories remain. Progress photos are observations only. The app resizes uploads to at most 1800 px on the long edge at JPEG quality 0.82, with a 320 px thumbnail at quality 0.72. The original file on the user's device is untouched. Photo content is never stored in localStorage or uploaded.

IDs use `crypto.randomUUID()`. Calendar dates use local time; timestamps use ISO UTC. Writes take an origin-scoped Web Lock, reload the latest object, apply one change, then save. This prevents two current Tracker tabs from overwriting independent changes. A stale edit to the same record is rejected. If Web Locks are unavailable, writes fail with a clear message rather than claiming to save safely. Older already-open versions of Tracker should be reloaded after updating the code.

The data-safety fixes needed no migration. Additive migrations: version 1 → 2 adds `exerciseNotes`; version 2 → 3 adds `cardioEntries` and `kneeEntries`; version 3 → 4 adds `savedMeals` and `recipes`; version 4 → 5 adds `journalEntries`; version 5 → 6 adds `customExercises`, `plans`, and `activePlanId: null`. `loadData` migrates in memory without rewriting the original saved object; the next successful user write saves the new schema. Existing sessions, food entries and check-ins are preserved. Entries contain a per-serving food snapshot. Changing an old entry's serving amount keeps that snapshot; choosing a different food creates a new snapshot.

Parse/schema failure stops use of stored data rather than silently overwriting it. Export wraps the state as `{ schemaVersion, exportedAt, data }`; restore also accepts earlier version 1–5 exports and migrates them in memory. Import validates required fields, previews counts, requires an explicit restore action, and checks that live data has not changed since preview. **Two private files are required for a full backup:** the data JSON includes settings, sessions, draft, foods, entries, check-ins, exercise notes, cardio, knee, saved meals, recipes and journal entries; a separate `tracker-photos-*.json` includes compressed JPEGs and metadata as base64. Photo import validates file structure, preview count and image signatures, then adds missing IDs atomically in one IndexedDB transaction. It does not overwrite existing photos or alter localStorage. The photo package is limited to 200 MB of decoded image data and may consume substantial memory during export/import. Download completion must be checked by the user before browser data is cleared.

Future Flask/SQLite migration should keep this frontend and replace the persistence boundary in `js/data.js` feature by feature. Map settings first, then sessions/sets, foods/entries, check-ins. Validate and back up the local JSON before any migration; use SQLite foreign keys and parameterized queries. There is no decision yet to start a backend.

## V3 planning and snapshots

V3 adds three top-level fields to the one localStorage object: `customExercises[]`, `plans[]`, `activePlanId` (`null` selects Original Plan). Built-in exercises remain derived from the unmodified `PROGRAM` constant, so a backup need not duplicate the accepted plan. Each custom plan has named days and ordered exercise slots with exercise ID, name snapshot and user-chosen sets/repMin/repMax/targetRIR/restSeconds/notes. These values are separate from `MASTER_PLAN.md`.

For custom and one-off training, `draft`/`sessions[]` carry a snapshot of the day as started, including exercise slots; logged sets retain their exercise name and ID. Legacy A/B/C/D sessions remain valid and use the original renderer. Editing or deleting a plan cannot rewrite finished sessions. Exercise deletion archives a definition if an existing template references it. Optional food/recipe photo ownership (`ownerType`, `ownerId`) live only in IndexedDB photo records; nutrition entries keep their existing macro snapshots.

Schema migration 5 → 6 adds empty arrays and `activePlanId: null` without changing old records. Backup validation accepts migrated versions 1–5 and validate V6. Actual implementation status is tracked in `V3_ROADMAP.md`.

## V4 local improvements — schema remains 6

Daily food search and recipe cook-size previews are transient views, not new stored entities. Search normalizes Vietnamese accents only for matching and orders results by the latest logged date; ties retain name ordering. Editing a historical entry can still select its snapshot when the original definition is absent. Existing snapshot and stale-edit rules continue to apply.

`scaleRecipe` clones the original recipe and multiplies numeric ingredient quantities by target servings / original servings. Per-serving nutrition stays unchanged (unknown stays null); batch totals use the preview servings. Steps, time strings and numbers embedded in prose are not scaled. Reset/reload discard the preview. Logging consumed portions remains a separate operation and uses the original per-serving snapshot. This is not redistribution of a fixed cooked batch.

Journal suggestions derive up to eight distinct tags from newest diary dates, deduplicated case-insensitively. Toggling changes the form only; explicit Save persists the existing tags[] field. Mood values and historical records are not reclassified. No migration, photo-store change or backup-format change is required.
