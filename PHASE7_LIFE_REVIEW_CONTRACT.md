# Tracker V4 — Phase 7A Life Review contract

2026-10-06 · **CONTRACT DESIGNED — NOT IMPLEMENTED — awaiting user approval.**

Design only. This document proposes future read-only Weekly Life Review and Monthly Memories. It does not authorize runtime changes, tests implementation, migrations or Phase8. Only this document and a status/link in V4_ROADMAP.md change in7A.

## 1. Audit baseline and design choice

Audited local main6424d33: Phase0–6 release, schema8, asset34. Fresh existing suite283/283 (0fail/skipped/cancel/todo),59 JS syntax checks. No Phase7 helper/UI/test exists. Existing Progress has a fitness-only weekly summary; that is not Phase7 Life Review.

Read: V4_ROADMAP.md, current/historical V4_IMPLEMENTATION_REPORT.md, DATA_MODEL.md, TRACKER_PRODUCT_IDEAS.md, README.md and FULL_STEP_BY_STEP_GUIDE.txt. Audited js/data.js, my-day.js, my-day-ui.js, journal.js, progress.js, nutrition.js, session-identity.js, session-readers.js, session-ui.js, custom-workout.js, photo-store.js, app.js source/navigation/editor flows and existing My Day/photo/Nutrition/identity/backup tests. Code governs field names; older prose sometimes abbreviates cardio as “minutes”, actual field is durationMinutes.

Options evaluated:

| Approach | Decision / trade-off |
| --- | --- |
| New pure period derivation + small read-only subviews, reuse existing source/read APIs | **Choose.** Independent domain errors and provenance, no persistent state; minimal additions when implementation is separately authorized. |
| Extend existing progress.weeklySummary | Reject for this scope: its output lacks coverage/provenance and contains target achievement; averaging null totals can coerce unknown toward zero. Leave this existing consumer unchanged and do not import it into Life Review. |
| Persist aggregates/flags/indexes | Out of scope; introduces invalidation/schema/storage decisions with no current need. |

Decisions fixed here: Monday weeks; calendar months; eligible-day coverage; chronological source lists; no previous-period comparison; journal-tag summaries instead of inferred activity events; no historical muscle classification; metadata-first monthly photos opened explicitly; no chart library; no persisted highlight/hide. No blocking schema/product choice remains for this design. Runtime still needs user approval.

## 2. Actual sources and cardinality

All dates below are stored local YYYY-MM-DD, independent of timestamps. IDs identify records; no content-based dedupe of different IDs.

| Source | Actual consumed shape | Cardinality / semantics |
| --- | --- | --- |
| journalEntries[] | id,date,mood,title,note,tags[],createdAt,updatedAt | Editor upserts by date; strict backup rejects duplicate journal dates and IDs. Empty mood is allowed. No activityId/catalog/energy/valence. UI calls tags “Thẻ hoạt động”; they remain user-entered labels, not verified activity events. |
| entries[] | id,date,meal,foodId,food:{name,serving,calories,protein,carbs,fat},servings | Many/day and many/meal. food is logged per-serving snapshot; recipe foodId is recipe:<id>. Library deletion does not invalidate snapshot. |
| sessions[] | id,date,workout(A/B/C/D/CUSTOM),week,sets[]; optional notes,updatedAt,workoutSnapshot,sessionStructure | History membership is the saved/completed collection, not a completed flag. Multiple/day allowed; draft/planningDraft excluded. UI Complete requires>=1set, but accepted legacy backup can have sets[]. Such a saved history record counts as1 history session,0 performed sets; never claim full prescribed workout completed. |
| saved set | id,exerciseIndex,exerciseName,setNumber,weight,reps,rir; optional unit,exerciseId,slotId | unit kg/lb, weight0 valid, reps>0. Structured ownership uses exact slotId. No duration/volume quality metric is inferred. |
| sessionStructure | revision,basis,slots[],order[] | Slots: id,exerciseId(null orID),sourceSlotId,replacesSlotId,status(active/removed/replaced),snapshot:{name,sets,reps,rest,rir,notes,setupNote}. Snapshot contains **no muscles**. |
| workoutSnapshot | planId,planName,dayId,name,exercises[] | Frozen slots have id,exerciseId,name,sets,repMin,repMax,targetRIR,restSeconds,notes; **no muscles**. Current customExercises/BUILTIN_EXERCISES metadata is not historical muscle evidence. |
| cardioEntries[] | id,date,activity,durationMinutes,distanceKm(null ornumber),intensity,notes | Multiple/day. Explicit cardio.activity text only; does not classify journal prose. |
| checkins[] | id,date,weight,waist,sleep (each null ornumber),knee,notes | Multiple/day, including notes-only. kg/cm/hours; a record does not imply every measurement known. No sleepHours/bodyMeasurement field assumed. |
| kneeEntries[] | id,date,moment(during/after/next-morning),pain(null or0–10 integer),swelling,instability,stiffness(unknown/no/yes),notes | Multiple/day. Membership uses date, not a shifted date from moment. Record only, no safety interpretation. |
| Photo metadata, separate IDB | id,date,category(daily/progress/gym/food/other),pose(''/front/side/back),weight,waist,note,createdAt,updatedAt; optional ownerType(food/recipe),ownerId | DB tracker-photos, store photos, version1, one record perID; blob+thumbnail are binary variants of that same record. All categories/orphan owners included on photo.date; never join owner ID to food-log dates. |

Strict backup requires complete finite nonnegative logged macros. dailyTotals defensively returns null per field if an already-readable snapshot has null/undefined; loadData does not fully validate every journal/nutrition record. Phase7 must retain defensive unknown semantics without relaxing logging/import. loadData validates root/planning/structured identity and can fail before independent domains are available; see §11.

## 3. Calendar and navigation contract

Anchor and injected today must pass existing validDate and be exactly YYYY-MM-DD. Membership is inclusive string comparison start<=record.date<=end **after validating dates**. No createdAt/updatedAt, UTC conversion, bare Date(YYYY-MM-DD), millisecond/86400000 division or elapsed hours.

- Week: Monday local calendar00:00 through Sunday23:59; operational boundaries are Monday/Sunday date strings. Any weekAnchor date normalizes to its Monday; end is+6 calendar days.
- Month: monthAnchor is a valid full date; normalizes to YYYY-MM-01, ends at final calendar day. Previous/next month navigate period starts, not January31-style day overflow.
- Previous/next week: normalized Monday−7/+7 calendar days. Previous month: day before start→its month start; next: day after end→its month start. Current buttons normalize freshly captured localDate().
- Enumerate calendar dates using the audited local-noon/shiftCalendarDate pattern; do not compute day counts using time durations. Existing weekStart agrees for normal modern dates, but its numeric-year Date constructor must not be used for years0000–0099. Build boundaries from validated ISO-with-local-noon strings; preserve four-digit years. Existing monthDays returns calendar padding nulls for UI; padding is not denominator data.
- Supported full periods must fit0000–9999 and existing validDate/shiftCalendarDate. If a boundary exits this range, navigation is disabled and manual selection reports “Khoảng ngày ngoài phạm vi hỗ trợ”; never wrap/clamp silently.
- Leap February2028 has29 days;2026 has28. Week2025-12-29→2026-01-04 crosses year. A leap/year/month crossing never resets record membership to timestamps.

Capture today once per derive using device localDate; pass it explicitly to pure helpers. Show “Tính đến YYYY-MM-DD”. Reopen/Refresh/current-period navigation captures today again, including after midnight or timezone change. Stored dates never get reinterpreted in a new timezone. Navigation retains selected week/month independently in the tab; no router/URL/storage preference required. Future periods can be viewed.

Validate the **whole target period**, not just its navigation anchor, before enabling previous/next/current. Invalid anchor/today or unsupported selected period produces a period-input error (pure interface rejects); UI retains prior valid selection with an inline labeled error and no writes. No blank selector silently becomes today. A currentAnchor whose full period exceeds supported bounds is null/disabled.

## 4. Eligible days versus calendar days

The final **coverage denominator is eligibleDays**, resolving earlier examples that use full calendar length. Also expose calendarDays and exact full range; do not penalize days after today.

| Period relation to today | eligibleDates / denominator | Text |
| --- | --- | --- |
| end<today (past complete) | all dates start..end | “Có ghi3/7 ngày trong tuần” |
| start<=today<=end (current) | start..today inclusive | “Có ghi3/6 ngày tính đến hôm nay”; range still Monday..Sunday |
| start>today (future) | [] /0 | “Khoảng này chưa có ngày đến hạn”; do not display0/0 or a percentage |

eligibleEnd=min(end,today) if today>=start, otherwise null. Calendar length stays7 or28/29/30/31. Weekly **aggregate metrics use eligible records only**. Monthly aggregate header also uses eligible records; monthly timeline includes all records whose dates lie in the full month. Future-dated records inside a current/future period remain visible in a separate “Bản ghi có ngày sau hôm nay” list (weekly) or labeled timeline groups (monthly), but never enter eligible coverage/distributions/totals. Display their record count separately with refs; do not hide them or let numerator exceed denominator.

Example current week2026-10-05..11, today2026-10-06: calendarDays7,eligibleDays2. Monday+Tuesday logs yield2/2, a saved Sunday log is future-dated provenance, not3/2. Future period eligible0 may contain future records; it is not necessarily an empty calendar.

## 5. Coverage and denominator matrix

Validate the domain before deriving; unavailable domains have null counts, not0. For available arrays, empty eligible record counts legitimately equal0 (“bản ghi”), never proof of behavior. Every numerator carries exact distinct dates and refs to **all** contributing records per date.

| Domain / displayed metric | Numerator / unit | Denominator / dedupe |
| --- | --- | --- |
| Journal coverage | dates with accepted journal record | eligibleDays;1/date. Record count separate; duplicate date is invalid, not picked latest. |
| Mood coverage | journal dates with explicit MOODS ID | eligibleDays;1/date; blank mood does not count. |
| Mood distribution | dates per exact known mood ID | knownMoodDays; not eligibleDays/calendarDays/journalDays. |
| Nutrition coverage | dates with>=1 readable logged entry, even if macro unknown | eligibleDays;3entries on1date=1day; entries counted separately. |
| Per-macro sum | sum of snapshot macro×servings on logged eligible dates | not a distribution; full sum unknown if any contributing day unknown. No logs means missing. |
| Per-macro average | sum of known daily totals | knownLoggedDays **for that macro**; explicit partial coverage label, not whole-week intake. |
| Workout coverage | dates with>=1 valid record in sessions | eligibleDays;2sessions same date=1day,2session records. |
| Performed exercises | sum of proven logged owner occurrences, per session | repeated same exercise in2sessions=2occurrences; no zero-log slots. Exact total null if any legacy ownership unresolved. |
| Muscle evidence | proven performed occurrences with no frozen muscle metadata | all proven occurrences are “Không xác định”; unresolved sets separate; no guessed known bucket/chart. |
| Cardio coverage | dates with>=1 cardio record | eligibleDays; multiple activities not deduped. Total recorded minutes uses actual durationMinutes; no records→missing minutes. |
| Check-in coverage | dates with>=1 checkin | eligibleDays; notes-only counts as record. No averages/measurement trend in bounded7. |
| Knee coverage (folded) | dates with>=1 knee record | eligibleDays; no symptom score/distribution/trend. |
| Photo coverage | dates with>=1 readable photo metadata record | eligibleDays; count unique photo IDs, not variants. Coverage measures metadata, not successful image decoding. |
| Journal tag frequency | distinct eligible dates containing explicit tag key | knownTagDays (dates with>=1 nonblank saved tag); multiple tags overlap, percentages not pie slices or summed to100%. Display day count; denominator explicit. |

Coverage includes all eight domains above (mood separate from journal), each separately. Secondary cardio/checkin/knee/photo rows may be folded but never collapsed into a wellness score. Distribution count and source-record count remain separate fields; no global source dedupe. Same-date meal count in drilldown uses distinct saved meal strings, not a new meal taxonomy.

## 6. Missing / unknown / zero / invalid semantics

| State | Evidence / value | Rendering / consequence |
| --- | --- | --- |
| MISSING | no relevant record or no explicit optional field; value null | “Chưa có bản ghi” / “Chưa ghi”; not neutral/rest/unchanged/0kcal. |
| UNKNOWN | readable record exists but requested fact unresolved, e.g.null macro or historical muscle absent; value null | “Chưa rõ” / “Không xác định”; explicit known/unknown counts and source refs. |
| KNOWN ZERO | actual finite numeric0 saved or derived from known values | show0 with units. Nutrition0/pain0/weight0 are preserved when source rules accept them, never repaired. |
| KNOWN NONZERO | valid finite number with named denominator/provenance | show value and unit/basis. No health assessment. |
| INVALID SOURCE / UNAVAILABLE | malformed record, duplicate identity, read error or numeric overflow | “Chưa đọc được [domain]”; all affected values null. No skip/repair/zero-fill. Independent domains stay usable if root load succeeded. |

Count0 means zero records known in the selected eligible range, not zero food eaten, intentional rest, no cardio performed or unchanged body. Blank journal mood→missing, not steady. pain null/status unknown stays unknown/missing as originally recorded; no record differs from explicitly recorded no/0. “Chưa xác nhận đã ghi đủ ngày” is a factual limitation; no completion state is inferred.

## 7. Mood and explicit tag semantics

Stable MOODS order/labels/marks, verbatim:

| ID | Label | Mark |
| --- | --- | --- |
| drained | Mệt | · |
| low | Chùng | ·· |
| steady | Bình thường | — |
| good | Ổn | ✦ |
| bright | Rất tốt | ✦✦ |

drained remains **Mệt**, not sadness/exhaustion severity or a new category. No numeric valence exists; no mean mood/happiness score or good/bad week. Valid blank mood: journal coverage may count that day; mood distribution excludes it. Unknown nonblank ID is malformed, not a new mood bucket/neutral; mood metric unavailable, do not coerce. Structural journal failures make journal/mood/tag domains unavailable; an invalid mood field alone may isolate mood while otherwise readable journal/tag facts remain (explicit submetric validation).

Tags are explicit saved tags[], UI-labeled “Thẻ hoạt động”. Show **“Thẻ hoạt động do bạn ghi”**, explained as labels, not verified activity events. No title/note NLP or inferred gym/sleep/eating activity. Count label-days, not occurrences in prose or actual event counts. Tag keys follow existing cleanTags semantics: trim and Vietnamese case-insensitive comparison; preserve accents/internal whitespace. Do not use accent-folded search identity to merge distinct tags. Blank keys are empty labels, not activities. Dedupe key once/date. Earliest chronological occurrence supplies original display spelling; stable first-occurrence order with original per-entry tag order. Keep refs to every contributing journal record. Cardio.activity is separately explicit cardio text, never merged into journal tags.

## 8. Workout evidence and unknown muscle

Completed-history session count=valid sessions[] IDs in eligible range; draft, history-edit candidate and planningDraft excluded. No fabricated performed work from template/prescription/active status. All actual saved sets count exactly once, including on removed/replaced slots; predecessor logs stay predecessor, successor logs stay successor. No expansion of replacement chains, no transferring totals/order/sets. Display “buổi lưu trong lịch sử”, not “đã làm đủ kế hoạch”.

Structured: validateSessionIdentity; group sets by exact (session.id,slotId). A slot contributes one performed occurrence only if>=1saved set; zero-log added/removed/replaced rows stay visible in source history but add0 performed occurrences. Saved sets remain tied to registry identity, not display order or current name.

Legacy: inspect saved rows/frozen workoutSnapshot only; no activation/write and no materialization from current PROGRAM/library to fill history. A unique consistent saved exerciseIndex+exerciseName group with unique set numbers and consistent optional exerciseId proves one legacy occurrence. Conflicting names/IDs at one index or duplicate owner/setNumber make **performed-occurrence count unknown**; retain session count and saved-set count if those facts remain valid. Expose proven occurrence count and unresolved set refs separately; never invent extra owners or discard those sets. Truly malformed numeric sets/IDs fail the workout domain; ambiguity alone affects the ownership metric.

Snapshots in current schema8 have no primary/secondary muscles. **Bounded7 does not display anatomical percentages.** It displays “Nhóm cơ không lưu trong snapshot: N lượt bài chưa xác định” for proven occurrences; muscleEvidence contains only visible unknown bucket. Current/renamed/archived/deleted custom definitions and name-based built-in inference are never consulted to classify historical muscles. If occurrence denominator is unknown, show it as unknown and unresolved-set count, not a percentage. A later frozen-muscle contract is separate, not required here and not permission for schema9.

No volume tonnage, load advice, quality score, program adherence or knee-safety inference. Weight units never mixed into a total. User-saved independent history copies are distinct sessions even if content matches.

## 9. Nutrition arithmetic and ownership

Use entries.food snapshots and servings only, never current foods/recipes/macros. Deleted library definition remains valid historical evidence. Recipe cook-size is irrelevant. Validate entry identity/date/meal/foodId/name/serving/positive finite servings and macro types before dailyTotals; numeric values finite and>=0. Runtime defensive null/undefined macro→unknown, exactly as dailyTotals, without authorizing new unknown-macro logs/imports. A string/NaN/Infinity/negative macro or nonpositive servings is invalid, not unknown.

Derive one canonical dailyTotals per eligible logged date. For each calories/protein/carbs/fat:

- no logged dates: fullTotal,knownSubtotal,knownDayAverage=null/missing, knownDays0;
- any unknown daily field: fullTotal=null/unknown; other macros still derive normally;
- knownSubtotal=sum only known daily totals, null if no known day (not invented0);
- knownDayAverage=knownSubtotal/knownDays if knownDays>0; label **“Trung bình [macro] trên K ngày có số liệu rõ, trong L ngày có ghi”**; disclose L−K unknown days. This is an average of recorded data, not estimated total intake;
- known0 days enter K and retain0; never divide by eligibleDays or fill missing dates with0.

Example3logged days, calories100/unknown/0→fullTotal unknown,knownSubtotal100,knownDays2,unknownDays1,average50 on2known days. Protein independently uses its own known-day denominator. Any sum/product overflow makes fullTotal/knownSubtotal/knownDayAverage unavailable for that macro, not Infinity/zero; no known-subset average presented for a computational error. Daily totals output null plus unavailable state for an overflowed field, separate from an unknown null. Counts/dates distinguish knownDays/unknownDays/unavailableDays; a period-sum overflow can occur even when all individual days were known. No target achievement/calorie recommendation/“ăn thiếu”/completeness assumption. No automatic previous-period comparison; defer even factual deltas to avoid extra denominator UX in bounded7.

## 10. Photos and monthly memories

Metadata read APIs: listPhotoMetadata uses readonly cursor, strips blob/thumbnail handles; getPhotoThumbnail(id) reads only selected thumbnail; getPhoto(id) is existing readonly original lookup. openExistingDb aborts onupgradeneeded if DB absent, returns empty without persisting DB/store. Do not call openDb/putPhoto/listPhotos/createPhotoBackup while deriving/browsing memories. Photo DB/version/index/backup format unchanged.

Actual listPhotoMetadata scans the store: **no date index/range API exists**. Future read adapter calls it once and passes the metadata-only projection to pure validation/filtering; derived output retains only selected-period metadata. Semantically display/read-model retains selected-month metadata only; physical cursor scan is whole metadata store, not month-bounded I/O. No Blob decoding/all-image getAll, no new index/store/migration. Reuse this minimal path; do not claim existing API reads only that month at storage level.

Photo ID counts once (original+thumbnail are variants). Identical repeated metadata projection of sameID may dedupe; conflicting sameID/date/metadata fails photo domain, never choose latest. category/owner do not create second events:10photos one date=photoCount10,photoDays1. Readable metadata count is independent of thumbnail/original success. Optional pose/note absent remains absent; invalid consumed metadata/date/ID/category/owner shape fails photos domain. Keep orphan owned photos on their own date; do not infer a meal occurred.

Monthly timeline groups full-month records date ascending, omits completely empty dates, preserves every independent record. Type order within day: journal,workout,nutrition,cardio,checkin,knee,photo. Multiple same-type records retain source-array order; photos stableID lexical order. No timestamp sorting changes membership/order. Each group has exact refs, user-entered journal title/note excerpt/tags/mood, saved workout title/sets and factual counts/measurement/source links. Nutrition daily card uses canonical snapshot totals/unknowns. Notes-only/check-in/knee records remain factual; knee details folded. Future dates explicitly labeled and excluded from eligible aggregate header.

Default photos are metadata cards with **“Mở ảnh”**; no automatic large photo grid/decoding. User explicitly opens selected photo: reuse getPhotoThumbnail then, show missing/unreadable state without falling back to original; explicit separate “Xem ảnh đầy đủ” may read selected original through getPhoto. No face recognition/best photo/image analysis/narrative/duplicate storage. All categories opt-in via opening this monthly view; no proactive notification/resurfacing.

Object URLs belong to UI only, not pure output. Register URLs, revoke on replacement/error/close/view or month switch, including old async results after navigation; never revoke an in-use image before replacement. Selected photo deleted between reads→scoped missing message; rederive updates metadata counts. Metadata failure makes photos unavailable but timeline/JSON domains remain usable; a single thumbnail failure does not remove readable metadata or change photo count. Exact existing photo viewer/date is source, not a copied photo record.

Persisted highlights/pins/hidden flags and best/worst ranking are deferred. There is no memoryHidden/highlight setting added, no month export/sharing workflow or AI story. Transient expanded/collapsed/open-photo UI is allowed and resets on reload.

## 11. Read consistency and malformed-domain isolation

On open/period change/Refresh/return: load latest canonical JSON **once** through existing loadData, take immutable read snapshot, capture today, then request latest readable photo metadata. No persisted cache. These stores have no common transaction; do not promise atomic cross-store snapshot. Show deriving/photo-loading status, use a view/request generation token so late metadata/thumbnail results cannot overwrite another selected period. Each displayed metric's source refs belong to that derivation, never a mix of two JSON reads. Reopening/return rederives latest edits/deletions; no reactive auto-writes or replay.

If canonical load throws (parse/schema/planning/identity), **all JSON domains unavailable**; do not raw-parse storage to bypass loadData or use stale JSON as latest. Independently readable photo metadata may still show photo memories with explicit JSON error. Entering this future read screen must not render old values labeled fresh if existing show navigation would otherwise abort; design a scoped read-error state, without weakening loadData or existing editors. No recovery/reset offered automatically.

After successful root load, each consumed domain is independently checked as stored data, not coerced through form-input normalizers. Preserve strict stored acceptance (e.g.backup may accept notes-only/empty optional fields or0measurements); do not impose new form-only limits on historical reads. Domain arrays must have unique IDs; journal must additionally have unique dates. Validate the **whole consumed domain array** for IDs/dates/consumed types so malformed records with unknown membership are never silently filtered away. Fields not used by review remain under existing validators. Structural journal validation excludes mood ID so an invalid nonblank mood can isolate only its metric; all other domain invariants must hold.

| Failure | Scope / value |
| --- | --- |
| entries invalid date/ID/servings/object/type/negative macro or duplicateID | Nutrition coverage/counts/totals unavailable; journal/workout/other domains unaffected. Defensive null macro is unknown instead, §9. |
| journal identity/date/title/note/tags shape/duplicate date | Journal,mood,tags unavailable; never choose a duplicate winner. Unknown nonblank mood alone→mood unavailable, journal/tags readable. |
| session invalid envelope/IDs/numeric sets/structured ownership | Workout metrics unavailable if reached after root load; root identity validation may already reject all JSON. Legacy ownership ambiguity alone preserves session/set facts, §8. |
| cardio/checkin/knee invalid consumed shape | Only that domain unavailable, no averages/imputation. |
| metadata read/shape/conflicting duplicateID | Photos unavailable; JSON still visible; no fake photoCount0. |
| one thumbnail/original read failure | Only selected image unavailable; metadata coverage remains known. |
| finite valid source arithmetic overflows | Affected numeric metric unavailable; keep independently known coverage/other fields. |

Do not catch everything and return empty arrays. Domain unavailable outputs carry safe reason codes/message and source refs when identity is provable; no data repair/write or raw sensitive content in logs. Whole-period emptiness is **true only if all domains readable and all full-period record counts0**; false if any known full-period record exists; null if no known record exists and some domain unavailable. Empty eligible aggregates plus known future records is not an empty calendar period.

## 12. Proposed pure interfaces and exact derived output

The following are **declarations for a future contract, not implementation code**. Names avoid the existing progress.weeklySummary collision. No storage/DOM/clock/IDB access inside pure helpers; no function creates a DB or object URL. Proposed small derivation module must keep independent domain boundaries without an analytics framework.

```text
lifeReviewPeriod(mode: week|month, anchor: YYYY-MM-DD, today: YYYY-MM-DD) -> Period
deriveLifeWeek(dataRead: DataRead, photoRead: PhotoRead, weekAnchor, today) -> WeekReview
deriveMonthMemories(dataRead: DataRead, photoRead: PhotoRead, monthAnchor, today) -> MonthReview

DataRead = {status: available, data: canonical-schema8-object}
         | {status: unavailable, reason: canonical-load-error}
PhotoRead = {status: available, records: metadata-only-array}
          | {status: unavailable, reason: photo-read-error}
```

Adapters perform I/O and pass read envelopes; photoRead carries the full-store metadata projection so pure helpers can validate before period filtering. Pure helpers validate domain consumption and compute period output. Failure reason is a stable code plus UI-safe string, not Error/DOM/Blob. Pure inputs/outputs do not contain object URLs; inputs not sorted/mutated in place, normalized strings not persisted, output arrays/objects detached from mutable source records.

```text
Period = {
  mode: week|month, anchor: normalized-start-date, start, end, today,
  relation: past|current|future, calendarDates: date[], calendarDays: integer,
  eligibleDates: date[], eligibleDays: integer, eligibleEnd: date|null,
  previousAnchor: date|null, nextAnchor: date|null, currentAnchor: date|null
}

SourceRef = {kind: journal|nutrition|workout|cardio|checkin|knee|photo, id, date}
          | {kind: set, id, date, sessionId, slotId: id|null, legacyIndex: integer|null}
          | {kind: day, date}
Reason = {code: canonical-load-error|invalid-source|photo-read-error|arithmetic-error,
          message: UI-safe-string}
Coverage = {
  status: available|unavailable, reason: Reason|null,
  calendarDays, eligibleDays, recordedDays: integer|null, ratio: number|null,
  dates: [{date, refs: SourceRef[]}],
  calendarRecordedDays: integer|null, futureRecordedDays: integer|null
}
Count = {state: known|unavailable, value: integer|null, refs: SourceRef[], reason: Reason|null}
Value = {state: known|missing|unknown|unavailable, value: number|null,
         unit: kcal|g|min|count, refs: SourceRef[], reason: Reason|null}
Domain<T> = {status: available, value: T, reason: null}
          | {status: unavailable, value: null, reason: Reason}
Common = {
  period: Period, empty: boolean|null,
  coverage: {journal,mood,nutrition,workout,cardio,checkin,knee,photos: Coverage},
  futureRecords: Domain<{recordCount: Count, sources: SourceRef[]}> per source domain,
  unavailableDomains: [{domain, reason}], sourceDays: [{date, refs: SourceRef[]}]
}
```

Coverage ratio=recordedDays/eligibleDays only when available and eligibleDays>0; otherwise null. Available future coverage recordedDays0,ratio null. Unknown measurement field does not make readable record coverage unknown. Common.sourceDays contains full-period dates with records, date ascending; unavailable sources excluded with explicit unavailableDomains (never pretend list complete). futureRecords keys are journal,nutrition,workout,cardio,checkin,knee,photos; journal moods/tags do not double-count parent record.

```text
WeekReview = Common + {
  journal: Domain<{recordCount: Count}>,
  moods: Domain<{knownDays: integer, missingMoodJournalDays: integer,
    missingMoodSources: SourceRef[], unrecordedEligibleDays: integer,
    unrecordedMoodDates: date[],
    buckets: [{id,label,mark,count,denominator: knownDays,dates,refs}]}> ,
  tags: Domain<{tagDays: integer,
    buckets: [{key,label,dayCount,denominator: tagDays,dates,refs}]}> ,
  workouts: Domain<{
    sessionCount: Count, savedSetCount: Count,
    performedOccurrenceCount: Value,
    provenOccurrenceCount: Count, unresolvedSetCount: Count,
    sessions: [{ref,title,setRefs,occurrences:[{ownerKey,slotId|null,name,setRefs}],
                ownershipState: known|unknown, unresolvedSetRefs}],
    muscleEvidence: {state: unknown|missing, denominator: integer|null,
      knownCount: 0, unknownProvenCount: integer, unresolvedSetCount: integer,
      buckets:[{key: unknown,label: Không xác định,count,refs}]}
  }>,
  nutrition: Domain<{
    entryCount: Count, loggedDays: integer,
    days:[{date,entryRefs,mealLabels:string[],totals:{calories,protein,carbs,fat:number|null},
           totalsState:{calories,protein,carbs,fat:known|unknown|unavailable}}],
    macros:{calories,protein,carbs,fat: {
      fullTotal: Value, knownSubtotal: Value, knownDayAverage: Value,
      loggedDays,knownDays,unknownDays,unavailableDays,
      knownDates,unknownDates,unavailableDates,unrecordedEligibleDays
    }}
  }>,
  cardio: Domain<{recordCount: Count,minutes: Value}>,
  checkins: Domain<{recordCount: Count}>,
  knees: Domain<{recordCount: Count}>,
  photos: Domain<{photoCount: Count,photoDays: integer}>
}
MonthReview = Common + {
  counts:{journal,nutrition,workout,cardio,checkin,knee,photos: Count},
  timeline:[{
    date, temporalState: eligible|future,
    groups:[{kind,items:[{ref,preview: MemoryPreview}]}]
  }]
}
```

All WeekReview metrics/counts above refer to eligible records unless expressly named calendar/future. MonthReview.counts refers to full calendar records and must be labeled “bản ghi trong tháng” (not eligible coverage); no extra monthly score/distribution. For Count unavailable, refs may be empty or identified diagnostics, never treated as complete. Value performedOccurrenceCount.unit=count; empty valid sessions/sets gives known0 occurrence count and muscleEvidence missing/empty bucket; ownership ambiguity gives unknown exact count with separate proven/unresolved facts. Moods knownDays0 returns all five buckets count0/denominator0 for textual “Chưa có tâm trạng được ghi”; do not render fractions/chart0/0. Missing mood counts exclude future records. Tags overlapping buckets never imply exhaustive activity distribution.

MemoryPreview is a closed per-kind projection: journal={title,noteExcerpt,moodID,tags}; workout={savedTitle,setCount}; nutrition={name,serving,servings,meal} for each entry; cardio={activity,durationMinutes,distanceKm,intensity}; checkin={weight,waist,sleep,knee,notes}; knee={moment,pain,swelling,instability,stiffness,notes}; photo={category,pose,note}. Notes-only items remain. Journal noteExcerpt is the exact first280characters plus explicit ellipsis when longer, no rewritten text. Workout notes stay available in source, not synthesized recap. Photo previews have no Blob/URL. Unavailable domains produce no fabricated preview, a scoped error row remains. Daily nutrition summary, if shown, uses the same canonical snapshot rule as §9 with entry refs; full text/sets/photos open at source.

## 13. Source drilldown and return

Every coverage numerator/distribution bucket/value/count has a “Xem bản ghi” action: opens its contributing dates/records in this read-only view, including missing-field dates for unknown metrics. Absent/missing periods offer date navigation, not a link to invented records. Each source item has exact SourceRef. No aggregate uses name-only lookup.

| Source | Future route using existing source | Safety / necessary small integration |
| --- | --- | --- |
| Journal/mood/tag | journal editor on exact date; verify ID/date latest | Existing journalDate + entry section; no autosave. Duplicate dates unavailable, not “latest”. |
| Nutrition | nutrition daily at exact date; focus actual entry ID/card | Existing selected foodDateSelection + daily subview; do not create/copy log. Multiple entries all retained. |
| Workout/set | history filtered source.date, focus exact session.id then saved owner/set card | Existing historyView(date) is read-only. Add transient ID focus target when authorized. **Never invoke store.reopen / Mở để sửa for viewing**: existing reopen writes draft and may replace user's active draft. Explicit later user Edit retains its normal confirmation/write contract. |
| Cardio | gym-logs, exact editingCardio/source.id/date | Existing record form can be selected without Save; root re-read first, retain unsaved guards. |
| Knee | gym-logs, exact editingKnee/source.id/date | Record-only editor; no diagnosis. |
| Check-in | checkins subview, editingCheckin/source.id/date | Existing source-specific editor; fields unchanged, Save remains explicit. |
| Photo | exact selected photoID/date viewer using existing readonly thumbnail/original APIs | Extend transient selected ID focus/read-only lookup; existing openDaySource photos ignores recordId and gallery currently scans listPhotos/all binaries. Life Review's default source action must select/read only that photo, not call the bulk gallery; gallery is an optional separate explicit action. Never create/edit a photo by opening it. |
| Date / My Day | my-day date selector = source.date | Use small transient date setter, not changing today's clock or opening date default by accident. |

Current openDaySource opens Gym by **date**, not exact session; gallery similarly date-only. Neither is falsely claimed exact-ID today. Future bounded adapter adds transient focus anchors to source cards; no router framework/persistent route or auto history candidate. For missing/deleted/moved source: re-resolve latest ID+date, report “Bản ghi đã thay đổi hoặc không còn ở ngày này”, do not open unrelated record or recreate it; Back rederives. A moved record may be offered its exact new date explicitly after validation.

Return context in closure: mode, weekAnchor,monthAnchor,originatingRef/metricKey,scrollPosition,focusKey, transient expanded-photo state. Back from source re-reads JSON/metadata, restores same period/mode then focuses originating item if still present; otherwise relevant metric heading, then period heading. Scroll restoration only after current content renders; focus target must remain above bottom nav. Respect existing dirty/unsaved editor gates; returning must not silently discard or Save. Nested My Day/source route keeps a transient return stack; its own date-return remains functional. Any user Save/Delete in source is outside the0-write viewing guarantee and follows existing policies, including confirmed journal/daily-photo deletion. Reload clears this context and returns normal Dashboard; next Life Review starts current week/month. Old summaries never write themselves back.

## 14. Bounded UX, accessibility and mobile

Placement proposal: **Tiến độ** retains existing Tổng quan tiến độ/Nhập & xem check-in; add **Tuần đã ghi** and **Ký ức tháng** subviews. Do not replace Dashboard, My Day or existing fitness summary. Header with title/range/today, previous/next/current real buttons and a labeled date/month selector; keyboard order follows visual order. Independent week/month anchors, local transient modes.

Weekly section order: range → coverage → mood → saved tags → workouts → nutrition → folded cardio/check-in/knee/photo → source dates/future records. Neutral headings/counts, textual denominators always. Monthly: range + coverage/record counts → chronological day groups → scoped source errors. No comparison cards, target/protein-achievement metrics, score/streak, automatic good/bad/improved/worsened/cause or medical/mental-health claim. “Có nhật ký4/7 ngày”, “Đã ghi2buổi” and “Chưa xác nhận ghi đủ ngày” allowed.

Empty/sparse rules: all-readable entire empty period says “Chưa có dữ liệu được ghi trong khoảng này”; eligible empty with future rows says so explicitly. Journal-only shows journal coverage/title/tags, blank mood stays missing; mood-only adds no nutrition; nutrition-only shows recorded snapshots; workout-only shows saved sets; photos-only month forms photo day groups without fabricating journals. Unknown macro/ownership/muscle shows its explicit state/counts, no chart with zero samples. Metadata unavailable says “Chưa đọc được kho ảnh; các bản ghi khác vẫn hiển thị”, no blanket “không có ảnh”. JSON unavailable scopes missing certainty as §11.

Simple semantic HTML counts/lists; optional static bars solely accompany accessible exact count and denominator text, never color alone. No chart dependency/canvas/worker. ol/li timeline/source lists and h1/h2/h3 hierarchy; unique labels per period mode and contextual source buttons; expanded lists use aria-expanded if implemented. Buttons follow current>=48px convention, visible focus, Tab/ShiftTab/Enter/Space. Source-return focus and scoped status/errors announced without repeated focus theft. Explicit photo-open may use inline details with return button; no new modal/Escape requirement. If existing dialog reused, retain Escape semantics. Alt uses only recorded category,date,pose/note; never describes inferred image content/person. No screen-reader certification promised before future testing.

At320/360/390: one column, long Vietnamese labels wrap, no wide tables or page-level horizontal scrolling. Coverage rows/distributions source actions stack; metadata cards/explicit thumbnail fit available width; optional grid wraps, no carousel-only access. Bottom nav unchanged; errors/buttons/focus reachable above nav; rendered future tests measure actual scrollWidth/clientWidth, not just CSS inspection. This document has no tested runtime UI/mockup claim.

## 15. Complexity, privacy and immutable reads

Filter whole relevant arrays once per derive; group dates/IDs with ephemeral Map/Set. Expected O(N) validation/filter/group across JSON records/sets/tags + O(D log D) day ordering, bounded D<=31; stable photo ID sorting O(Pselected log Pselected). Metadata projection currently O(Pall), no full image decoding. No measured large-dataset claim, persisted index, normalized-cache fields, background worker or speculative optimization.

No source mutation/in-place sort, no tags generated from prose, no auto repair/IDs/timestamps, localStorage set/remove/clear, IDB readwrite, openDb/init or writes on open/nav/Refresh/drilldown/Back/image viewing. Object URLs and view caches are ephemeral presentation resources only, released on exit; no cached summary in localStorage/sessionStorage/IDB. Snapshots/arrays remain detached. No AI/network/image analysis/CDN/analytics/backend/auth/cloud/upload. All data remains private local; testing uses disposable synthetic origin, never real user records.

**Schema8→8; no migration.** Highlights/hide/pins, correlations, health/mental scoring, mood valence, calorie recommendations, workout quality, automatic best/worst dates, streak pressure, proactive notifications, face/image classification, AI recap/stories, cloud/backend/auth and Phase8 explicitly deferred. Current6 deferred nutrition proposals remain deferred. A later persistent feature requires its own contract; no schema9 designed here.

## 16. Future RED test matrix — NOT IMPLEMENTED / NOT RUN

These are acceptance tests to write only after approval, before future implementation. Existing283 tests/assertions remain. Freeze synthetic inputs and compare JSON/source arrays/IDs/order/metadata before/after. No7A test files/fixtures created.

| ID | Future RED expectation |
| --- | --- |
| P1 | Monday2026-10-05 and Sunday11 same week, Sunday04 prior; prev/next/current exact ranges. |
| P2 | Month Jan31→Feb start, Dec→Jan year boundary, leapFeb2028=29/nonleap2026=28; no UTC shifts. |
| P3 | todayTue06 week05..11: eligible2 vs calendar7; last current day inclusive; future periodeligible0/ratio null. |
| P4 | Future-dated Sunday record visible in future refs, not eligible numerator/averages; full future month records retained timeline. |
| P5 | ISO timestamps near midnight never change stored-date membership/order; timezone/DST calendar stepping, years0000–0099 and range-boundary disabled navigation. |
| P6 | Blank/invalid anchor/today/date-time strings reject without defaults; whole previous/next/current period bounds checked, prior UI selection retained with error. |
| C1 | Mixed complete week4journal/3mood/2nutritiondates gives4/7,3/7,2/7; each source refs exact. |
| C2 | 3food entries one date=1coverage day/3records;2sessions one date=1day/2sessions;10photos one date=1day/10IDs. |
| C3 | Notes-only checkin counts record day but weight/waist/sleep remain null; knee/cardio own dates unaffected by journal. |
| M1 | Missing logs→null totals/missing, never0kcal/rest/neutral. Actual0macro/weight/pain preserved. |
| M2 | Past complete31-day month with8journal days/6known moods:8/31,6/31,distribution denominator6;25missing mood dates not neutral. |
| M3 | MOODS order/labels/marks exact, drained=Mệt; no valence or score fields; blank mood excluded. Invalid nonblank mood only fails mood; duplicate journal date fails journal-derived domains. |
| T1 | Saved tag trim/case dedupe once/day; accents/internal spaces retain identity; overlapping labels do not sum100%; note/title matches never create activities. |
| W1 | Multiple sessions/independent recovery copies counted byID; live/history candidate drafts excluded; accepted empty-set history counts1session/0work. |
| W2 | Added/removed/replaced zero-log rows0performance; old/new exact set owners counted independently, reordered slot registry and logs unchanged. |
| W3 | Legacy proven groups count occurrences; mixed names/IDs/duplicate owner numbers yield unknown exact count with unresolved refs, no current PROGRAM reconstruction. |
| W4 | Unknown muscle bucket includes every proven occurrence; deleted/changed current library cannot alter historical result; ambiguous denominator no percentage. |
| N1 | Current food/recipe edit/delete leaves logged snapshot totals unchanged; servings multiplier exact, cooking target irrelevant. |
| N2 | 100/null/0 daily calories→unknown fullTotal,100knownSubtotal,2known days,average50; protein known denominator independent; missing days excluded. |
| N3 | Invalid type/negative/nonfinite sources unavailable, null/undefined defensive macro unknown; overflow isolated per macro. No widening backup/import validation. |
| R1 | Monthly oldest→newest, stable type/source order, journal-only/photos-only/workout-only/empty month and notes-only groups, no best/highlight/narrative. |
| R2 | Photo metadata membership by own date not owner/timestamp; original+thumbnail count1; orphan food-photo retained; conflicting ID fails photo domain. |
| R3 | Absent DB read returns[] without persisted DB creation; metadata-only cursor/selected thumbnail; image failure no silent original fallback; no getAll binaries. |
| I1 | JSON root load failure not bypassed; independent photos may render; malformed domain unavailable while readable siblings remain; empty=true/null/false tri-state exact. |
| I2 | Frozen input/output detachment,0Storage writes/0IDB readwrite, no source in-place sort/normalize/repair. Backup schema8 byte-equivalent after viewing. |
| D1 | Every coverage/value/bucket/member ref IDs/dates/set owner exact; selected missing/deleted/moved source fail safely, no reopen write. |
| D2 | Out-of-order async metadata/image completion cannot overwrite new period; Back rederives edited/deleted source, restoring mode/anchor/focus. |

## 17. Future synthetic browser flows — NOT EXECUTED

| Flow | Acceptance |
| --- | --- |
| A | Full mixed week, coverage/counts/refs exact; no judgment or target score. |
| B | Sparse week1journal blankmood, neutral missing other domains. |
| C | Entire empty week, no misleading chart or0nutrition. |
| D | Current incomplete week eligible denominator + separately visible future record. |
| E | Exact mood labels/order/distribution and missing dates; knownMoodDays denominator. |
| F | Defensive unknown macro, per-field average known-day denominator; other fields remain. |
| G | Multiple workouts/replace/zero-log/legacy ambiguity/unknown muscle, history ownership intact. |
| H | Each source kind + My Day exact date/ID, Back same mode/range/focus/scroll;0writes on viewing, no store.reopen. |
| I | Mixed month chronological memory/source groups, no AI/highlight ranking. |
| J | Photos-only month/date and10photoIDs/day; explicit thumbnail/original opening only, URL cleanup. |
| K | Explicit edit/delete in source→Back rederive; source writes counted separately from review0write probes. |
| L | Reload clears transient route/period/photo expansion; saved source data unaffected; next opens current period. |
| M | Metadata read failure/absent DB/thumbnail failure/invalid JSON or domain; isolation and honest empty state. |

Exercise major affected views/long labels/unknown/error/drilldown/return at **actual320/360/390** and desktop. Keyboard Tab/ShiftTab/Enter/Space, visible focus, meaningful labels/counts/denominators; existing Escape behavior only where dialog used. Probe Storage/IDB writes and absent DB creation, exact snapshots + photo metadata + blob/thumbnail bytes unchanged, source IDs/owners untouched. Capture console/errors and inspect screenshots; do not equate future test specification with passing evidence.

## 18. Implementation split proposal and release boundary

**7B-1 (only after approval):** pure calendar/domain/provenance validation + Weekly Review, including metadata coverage via existing readonly projection; source drilldown/date setters/ID focus/read-error/return context; RED P/C/M/T/W/N/I/D groups, full baseline, weekly browser A–H/K/L/M and all3widths. Keep existing fitness weeklySummary unchanged. Done only when all scoped semantics/provenance/0write invariants tested. Recommend current coding model/high for denominator/unknown/ownership/error logic.

**7B-2 (separate authorization after7B-1):** Monthly Memories + explicit photo read/URL lifecycle, future/monthly ordering/empty states and final Phase7 regression; RED R/I/D photo/month groups; browser I/J plus all source/error/reload regressions; all3widths/keyboard/privacy/backup immutability review. No extra schema/highlight/hide. Mark bounded7 implemented/tested only after both releases and final gates, not on7A approval alone.

Risks resolved in contract, still to verify in code: all-store metadata scan, cross-store non-atomic read, year00–99 Date constructors, latest-root read errors, null coercion in old fitness summary, partial unknown denominators, legacy set ownership, no historical muscle fields, exact source-ID focus vs existing date-only routing, history reopen writes, editor dirty guards and object URL races. No blocking persistent state required. User approval of this written contract is the gate; no7B/Phase8 runtime authorized by this document.

## 19. Contract review checklist — design resolution, not runtime tests

| # | Resolved rule / section |
| --- | --- |
|1|Week Monday..Sunday §3|
|2|Calendar month/leap/year bounds §3|
|3|Current eligible start..today inclusive §4|
|4|Futureeligible0,no0/0,future records visible §4|
|5|Independent coverage domains §5|
|6|Mood/tag/per-macro denominators §5/7/9|
|7|Date coverage vs source-record count §2/5|
|8|Missing/unknown/zero/invalid table §6|
|9|Exact MOODS,no valence §7|
|10|drained=Mệt unchanged §7|
|11|Null propagation/per-field known days §9|
|12|Saved snapshots/current library not joined §8/9|
|13|Performed saved owner occurrences only §8|
|14|Visible unknown muscle evidence,no guessed anatomy §8|
|15|Explicit journal labels,not inferred events §7|
|16|Photo IDs vs dates vs binary variants §10|
|17|Chronological month/stable source order §10|
|18|Exact SourceRef and metric refs §12/13|
|19|Transient drilldown/return/dirty/source missing §13|
|20|Root fail-closed/domain isolation/empty tri-state §11|
|21|Immutable0write viewing §15|
|22|ExistingDB readonly/no creation/no migration §10/15|
|23|Empty/sparse/future/unavailable UI §14|
|24|Semantic controls/counts/focus/alt §14|
|25|320/360/390 one-column,no wide tables §14/17|
|26|Local/private/no AI/network §15|
|27|No scoring/judgment/comparison §7/9/14/15|
|28|Schema8 stays8,persistent flags deferred §15|
|29|7B-1 then separately7B-2 §18|
|30|Future RED + browser A–M specified,not run §16/17|

**7A done condition:** actual code/source audit, written resolved contract, minimal roadmap status/link, self-review for contradictions and unchanged app/tests verified. **Phase7 runtime NOT IMPLEMENTED / NOT TESTED. STOP for user review.**
