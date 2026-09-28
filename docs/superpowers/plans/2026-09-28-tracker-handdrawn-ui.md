# Tracker Hand-Drawn UI Implementation Plan

Steps use checkboxes to track completion.

**Goal:** Apply the approved hand-drawn Tracker design to the existing personal fitness app without losing any saved data or features.

**Architecture:** Keep the Vanilla JavaScript render functions and one `localStorage` document. Group the seven existing views under five visible navigation items, and change the shell, markup classes, and shared CSS tokens. Bundle a Vietnamese-capable handwritten font locally.

**Tech Stack:** HTML, CSS, JavaScript modules, Node built-in test runner, localStorage.

## Global Constraints

- Keep the current storage key and schema; the user's saved records must remain readable.
- Keep Workout A/B/C/D and all plan values from `MASTER_PLAN.md` and `js/program.js`.
- Keep functional forms, edit/delete confirmation, JSON backup, and accessible focus states.
- Use the approved five-part layout: Hôm nay, Tập luyện, Ăn uống, Tiến độ, Cài đặt.
- Use the hand-drawn paper palette and Patrick Hand font, which supports Vietnamese.
- Do not push private plan or history files to GitHub.

---

### Task 1: Navigation contract and shell

**Files:** Modify `index.html`, `js/app.js`; create `js/navigation.js`, `tests/navigation.test.js`.

**Interfaces:** `navigationGroup(view)` maps each existing view to one of the five primary sections. `show(view)` uses it to mark desktop and mobile controls active.

- [x] Write a test that `program`, `workout`, and `history` map to `training`, and `checkins` maps to `progress`.
- [x] Run `npm test` and see the test fail because `js/navigation.js` does not exist.
- [x] Implement the mapping and update the shell to five desktop and five mobile buttons.
- [x] Add a training subnav for Program, Workout, History; preserve the seven render functions.
- [x] Run `npm test`; inspect active navigation after direct and shortcut navigation.

### Task 2: Tracker typography and visual tokens

**Files:** Modify `css/style.css`, `index.html`, `README.md`; add `assets/fonts/PatrickHand-Regular.ttf` and its `OFL.txt` license.

**Interfaces:** Shared CSS variables for paper, pencil, red, blue, yellow, irregular radii, and hard shadows. Existing semantic button and form classes remain usable.

- [x] Verify the font source and Vietnamese support from Google Fonts metadata.
- [x] Bundle the font; change the visible name and HTML title to `Tracker`.
- [x] Replace green/soft-shadow styling with the approved paper, dotted texture, hand-drawn borders, hard shadows, and font.
- [x] Keep a visible focus outline and touch targets at least 44px.
- [x] Inspect desktop and narrow mobile layouts for clipping and contrast.

### Task 3: Apply the approved screen hierarchy

**Files:** Modify `js/app.js`, `css/style.css`.

**Interfaces:** Existing data and form handlers remain unchanged; views gain layout classes and clearer visual hierarchy.

- [x] Put the next workout first on the dashboard, followed by actual nutrition and check-in data and shortcuts.
- [x] Present A/B/C/D as compact day choices with exercise details for one selected day.
- [x] Make set entry and previous-performance context prominent in workout cards.
- [x] Organize nutrition, history, check-ins, and settings with readable empty states.
- [x] Run `npm test` and manually exercise save, reload, edit, delete, and export paths.

### Task 4: Verification and checkpoint

**Files:** Modify `README.md` and this plan only if test results reveal a needed change.

- [x] Run `npm test` and JavaScript syntax checks.
- [x] Check the app in a browser at desktop and 320–390px widths; inspect console errors.
- [x] Confirm the old storage key still loads and all seven underlying views remain reachable.
- [x] Review `git diff` for accidental changes to private or plan files.
- [x] Commit only the intended tracked files on `codex/tracker-handdrawn-ui`; do not push.

**Verification note:** The browser created a JSON download link and copied valid JSON to its clipboard. Its in-app download event timed out, so actual file download remains unverified in that browser. The copy option works as a backup fallback.
