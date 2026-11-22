# Implementation Plan: EPMCDMETST-73342 (Overdue quick filter)

Status: APPROVED with recommendations (Phase 4 gate, human approval "Approved, use your recommendations", 2026-11-23). Not committed. Implementation (Phase 5) starts only on a separate "Proceed".
Inputs: docs/EPMCDMETST-73342/requirements.md (APPROVED v2), architecture.md (APPROVED, amended R1-R5), design-review.md (APPROVED with recommendations).
Method: static read of repo files only by step4-impl-plan. No tests were run for this plan, so no counts are claimed. Baseline counts are recorded in Phase 0 from real output.
Authoring note: the subagent declined to write this file before human approval; the orchestrator wrote it from the subagent's returned draft after approval.
All paths are relative to the repo root; commands run from `task-manager-app/` unless stated. All commands are PowerShell-compatible.

## Resolved decisions
1. The new steps file defines its own small `row` helper; `due-date.steps.js` stays untouched.
2. Optional scenario 8 (add without a due date while filtered) is dropped; it is outside AC1-AC4 and the behavior is already accepted (L4).
3. The user performs the Phase 2 manual visual check; a Playwright screenshot is not a substitute.
4. `npx playwright install chromium` is approved if the browser is missing.
5. No commit happens inside Phases 0-4; committing is a later, separate gate.

## 0. Scope and safety rules
- Frontend and tests only. No backend, schema, API or `migrations.js` change. No `ALTER`, `DROP` or data rewrite.
- Never touch the three tracked database files in `task-manager-app/backend/` (the main DB, `-shm`, `-wal`). The `guard-tasks-db` PreToolUse hook blocks any command whose text contains the database file name, so no command in this plan names it. Use directory-level git checks: `git status --porcelain -- task-manager-app/backend`.
- Automated E2E uses `DB_PATH=tests/.tmp/e2e.db` (playwright.config.js, `reuseExistingServer: false`; `pretest:bdd` clears `tests/.tmp`). Backend tests use `os.tmpdir()` temp DBs. Manual runs must set `DB_PATH` to a temp file.
- Do not stage `docs/codemie/analytics/*.json` or `.claude/hooks/subagent-audit.log`. No commit, push or PR in this plan.
- Script names verified in `task-manager-app/package.json`: `test:frontend`, `test:backend`, `test:bdd`, `test:bdd:gen`, `test:search` (skips `pretest:bdd` and `bddgen`; do not use for new scenarios), `build`.

## Phase 0: Baseline and backup (no code changes)
1. `git branch --show-current` (expect `feature/EPMCDMETST-73342-overdue-filter`); `git rev-parse HEAD` (record sha).
2. `git status --porcelain` (record). `git status --porcelain -- task-manager-app` must be empty.
3. Ports free: `Get-NetTCPConnection -LocalPort 4000,5173 -ErrorAction SilentlyContinue` (expect nothing). Stop any dev server first.
4. Backup of edit targets (git is the primary backup; no database files):
   `New-Item -ItemType Directory -Force "$env:TEMP\epmcdmetst-73342-backup" | Out-Null; Copy-Item task-manager-app\frontend\src\App.jsx, task-manager-app\frontend\src\dates.js, task-manager-app\frontend\src\styles.css, task-manager-app\frontend\test\dates.test.js "$env:TEMP\epmcdmetst-73342-backup"`
5. Baseline runs, recording the pass/fail counts printed by each: `npm run test:frontend`, `npm run test:backend`, `npm run test:bdd` (if chromium is missing, `npx playwright install chromium` is approved).
6. Re-check isolation: `git status --porcelain -- task-manager-app/backend` is still empty.
Checkpoint 0 (HITL): report branch, sha, baseline counts, clean backend directory. Proceed only on "Approved" / "Proceed".

## Phase 1: Pure helper and unit tests (tests first)
Files:
- `task-manager-app/frontend/test/dates.test.js`: change the import to `{ todayLocal, isOverdue, filterTasks }` and append tests. Existing tests unchanged. Planned cases:
  1. overdueOnly false and empty query returns every valid task as a new array; input not mutated.
  2. overdueOnly true keeps only a past-due non-done task; excludes done, null, empty string, due today and future.
  3. Query is case-insensitive and not trimmed (`'AL'` matches `alpha`; `' al'` does not).
  4. Filter and search combine (AND).
  5. Today boundary with overdueOnly (yesterday included, today excluded).
  6. Malformed rows dropped (null, undefined, string, missing id, non-string title); `id: 0` is kept.
  7. Legacy status `blocked` with a past date is included when overdueOnly.
  8. Empty input returns `[]`.
  9. Agreement table: for a set of (due, status) pairs, `filterTasks(..., true, T)` includes a task exactly when `isOverdue(due, status, T)` is true (FR-3 drift guard).
  10. Unknown status string treated as not done (included when past due).
- `task-manager-app/frontend/src/dates.js`: update the header comment (L2) and add:
  ```js
  export function filterTasks(tasks, query, overdueOnly, today) {
    const q = query.toLowerCase();
    return tasks.filter((task) => {
      if (!task || typeof task !== 'object' || task.id == null || typeof task.title !== 'string') return false;
      if (!task.title.toLowerCase().includes(q)) return false;
      return !overdueOnly || isOverdue(task.due_date, task.status, today);
    });
  }
  ```
  Contract (L1): exact signature; lowercase without trim; guard verbatim; new array; no mutation; `isOverdue` is the only overdue definition.
Verification:
- After tests are written (before the helper): `npm run test:frontend` must fail only on the new `filterTasks` cases.
- After the helper: `npm run test:frontend` passes, with existing tests still passing (compare to Phase 0 baseline plus the new cases).
- `git status --porcelain -- task-manager-app/backend` is empty.
Checkpoint 1 (HITL): show diff of both files and test output; stop for approval.

## Phase 2: UI and styling
Files:
- `task-manager-app/frontend/src/App.jsx`:
  - import `filterTasks` (keep `todayLocal`, `isOverdue`; `TaskItem` still uses them).
  - add `const [overdueOnly, setOverdueOnly] = useState(false);` next to `searchQuery`.
  - replace the inline `visibleTasks` filter (and `normalizedQuery`) with `const visibleTasks = filterTasks(tasks, searchQuery, overdueOnly, todayLocal());`.
  - inside `<div className="search-form">`, below the search input, add:
    ```jsx
    <div className="filter-toggle">
      <input id="overdue-only" type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
      <label htmlFor="overdue-only">Show overdue only</label>
    </div>
    ```
  - after the existing "No tasks yet." line add:
    `{hasLoadedTasks && overdueOnly && tasks.length > 0 && visibleTasks.length === 0 && (<p className="empty" role="status">No overdue tasks.</p>)}`
    The two messages are mutually exclusive. `load()`, `handleAdd`, `handleDelete` and `TaskItem` are untouched (FR-7).
- `task-manager-app/frontend/src/styles.css` (R1/M1), append:
  ```css
  .search-form .filter-toggle { display: flex; align-items: center; gap: 0.5rem; }
  .search-form input[type='checkbox'] { width: auto; padding: 0; }
  ```
Verification:
- `npm run test:frontend` (still passes); `npm run build` (compiles; `dist/` is gitignored).
- Manual visual check performed by the user. Terminal 1: `$env:DB_PATH = Join-Path $env:TEMP 'ovd-manual.db'; $env:PORT = '4000'; npm run start --prefix backend`. Terminal 2: `npm run dev:frontend`, then open http://localhost:5173. Check: checkbox is small and inline with its label (not stretched), keyboard Space toggles, the overdue-only list is correct, and the empty message shows. Cleanup: stop both, then `Remove-Item "$env:TEMP\ovd-manual.db*" -Force -ErrorAction SilentlyContinue`.
- `git status --porcelain -- task-manager-app/backend` is empty.
Checkpoint 2 (HITL): show diff, build result and the user's visual-check outcome; stop for approval.

## Phase 3: BDD / Playwright tests
New files only; `due-date.feature`, `due-date.steps.js`, `fixtures.js` and `support/*` are not modified.
- `task-manager-app/tests/bdd/features/overdue-filter.feature` (R2). Every scenario starts with `Given the browser clock is set to local noon today`. Labels are chosen so none is a prefix of another (row matching is by substring). Title-scoped assertions only (M4b).
  1. Default state: filter is off and both a past-due and a future task are listed.
  2. Toggle on shows only overdue: seed past (todo, 3 days ago), future (todo, 5 days from now), finished (done, 3 days ago), undated (todo, no due date), today (todo, due today). Turn on; past listed and marked overdue; the other four not listed.
  3. Toggle off restores all: same seed; on, then off; all five listed; filter is off.
  4. Empty state: seed future (todo, 5 days from now); turn on; search for "future"; message "No overdue tasks." shown, "No tasks yet." not shown, future not listed. Seeding a non-overdue task avoids the empty-DB case (M4a); the search keeps stale rows from interfering and covers filter plus search.
  5. Filter plus search: seed river and stone (both overdue) and pebble (future); on; search "river"; river listed; stone and pebble not listed.
  6. Add with a past due date while filtered: on; add a task due 2 days ago; it is listed; filter still on.
  7. Delete while filtered: seed river and stone (both overdue); on; delete river; river not listed; stone listed; filter still on.
- `task-manager-app/tests/bdd/steps/overdue-filter.steps.js` (R2/M3). Imports `{ Given, When, Then }` from `./fixtures.js`, `createTask` from `../support/api.js`, `localDateOffset, localNoon` from `../support/dates.js`. Defines its own local `row(world, title)` identical to the one in `due-date.steps.js`. Existing step texts are reused verbatim for clock, open, search and labelled seeding. New steps:
  - Given `a {string} task labelled {string} exists with a due date {int} days ago` / `... {int} days from now` / `... with a due date today` (title via `world.nextTitle(label)`, id pushed to `world.createdIds`).
  - When `I turn on the overdue filter` / `I turn off the overdue filter` (`getByLabel('Show overdue only')` check/uncheck).
  - When `I add a task with a due date {int} days ago`: fill, click Add (exact), wait for the title input to be empty; do not assert row visibility (M2). Set `world.title`.
  - When `I delete the {string} task` (click `Delete <title>`, exact; expect the row count 0).
  - Then `the {string} task is listed` / `the {string} task is not listed` / `the {string} task is marked overdue`; `the added task is listed`; `the overdue filter is on` / `the overdue filter is off` (`toBeChecked`); `the empty message {string} is shown` / `... is not shown`.
Verification:
- `npm run test:bdd:gen` (bddgen fails on missing or ambiguous steps).
- `npm run test:bdd` (full, so `pretest:bdd` resets `tests/.tmp`; includes all existing due-date scenarios, which must still pass).
- Iteration only: `npx bddgen; npx playwright test --grep "Overdue"`.
- `git status --porcelain -- task-manager-app/backend` is empty; `tests/.tmp/` and `.features-gen/` are gitignored.
Checkpoint 3 (HITL): show new files and run output; stop for approval.

## Phase 4: Final regression
1. `npm run test:frontend`, `npm run test:backend`, `npm run test:bdd`: compare with Phase 0 baseline counts; all existing tests still pass, plus the new ones.
2. `npm run build`.
3. `git status --porcelain`: expected changes only:
   - modified: `frontend/src/App.jsx`, `dates.js`, `styles.css`, `frontend/test/dates.test.js`
   - new: `tests/bdd/features/overdue-filter.feature`, `tests/bdd/steps/overdue-filter.steps.js`, `docs/EPMCDMETST-73342/*`
   - nothing under `task-manager-app/backend`.
4. `git diff --stat` reviewed; analytics JSON and the subagent audit log are not staged.
Checkpoint 4 (HITL): report evidence; code review (Phase 6) and any commit need separate approval.

## Mapping of design-review items
| Item | Where addressed |
|---|---|
| R1 / M1 scoped checkbox CSS plus visual check | Phase 2 styles.css; manual check by the user |
| R2 / M2 / M3 new BDD steps and add-while-filtered | Phase 3 steps file; `I add a task with a due date {int} days ago` |
| R3 / M4 empty-state seeding, title-scoped asserts, use `test:bdd` | Phase 3 scenarios 4-5; verification commands |
| R4 / L1 helper contract | Phase 1 `filterTasks` and cases 1-10 |
| L2 header comment | Phase 1 dates.js |
| L3 `role="status"` | Phase 2 App.jsx |
| L4 / N2 accepted behaviors | Accepted, no hint; no scenario (optional scenario dropped) |
| R5 / N1 architecture doc | Already applied; no action |
| Backend tests | No backend change, so no edits; run in Phases 0 and 4 |

## Rollback
- Before any commit: restore a file with `git restore <path>` (only the six paths above) or from `$env:TEMP\epmcdmetst-73342-backup`; delete the two new test files with `Remove-Item`. Never use a repo-wide `git restore`, `git checkout .` or `git clean`.
- After a commit: `git revert <sha>` (needs approval). No data rollback is needed since there is no schema or data change.
- Remove manual temp DBs: `Remove-Item "$env:TEMP\ovd-manual.db*" -Force -ErrorAction SilentlyContinue`.
