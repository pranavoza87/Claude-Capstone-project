# Implementation Plan: US-101 Optional Task Due Date

**Status:** Approved by human reviewer (plan only; implementation requires separate approval)
**Inputs:** `docs/requirements.md`, `docs/architecture.md`, `docs/design-review.md` (H1, H2, M1-M4, L1-L4 incorporated)
**Conventions:** Paths are relative to `task-manager-app/` unless noted. All commands are PowerShell.

## 0. Findings that shape the plan

- **No git repo.** Rollback depends on the backup taken in Step 0.2.
- `db.js` ends with `module.exports = db`; tests call `db.exec`, `db.prepare`, `db.close` on it. It must stay as is (H1).
- No `tests/` folder, Playwright config, or `cross-env` exists. Root scripts `test:bdd`, `test:search`, `test:bdd:report` point at a layout that does not exist. Playwright work is greenfield (H2).
- PATCH builds its column list from the validator; `PATCHABLE_FIELDS` stays `['title','status']`. Only its `RETURNING` clause changes.
- Frontend is `"type":"module"`, backend is CommonJS (affects where `dates.js` tests run, L4).
- Node is v22.18.0, so `node --test` glob arguments work.
- `tasks.due-date.test.js` (named in requirements section 6) holds API and validator tests. Migration tests go in a separate `migrations.test.js` so they can load `migrations.js` without opening the default `tasks.db`.
- **Approved deviation (M3):** `requirements.md` section 3.3 says PATCH is unchanged. Architecture D1 and `requirements-local.md` FR-8 add `due_date` to the PATCH response (additive). Recorded here as an approved deviation. Amending `requirements.md` section 3.3 is optional and needs separate approval.

## Step 0. Baseline and safety net (no code changes)

1. Record the backend baseline pass count:
   `Set-Location backend; node --test; Set-Location ..`
2. Back up project and database (exclude `node_modules`; check `tasks.db` exists first):
   - `robocopy . ..\task-manager-app.bak /E /XD node_modules dist`
   - `Copy-Item backend\tasks.db* ..\tasks.db.bak -ErrorAction SilentlyContinue`
3. Create or append `.gitignore` with `tests/.tmp/`, `.features-gen/`, `test-results/`, `tests/Test Execution & Reporting/`.

## Phase 1. Database and backend (ST-1, ST-2)

### 1.1 New `backend/src/migrations.js` (H1, L3)
- Export `{ migrate }` only; does not touch `db.js`.
- `migrate(db)`: `PRAGMA table_info(tasks)`; if no `due_date` column, `ALTER TABLE tasks ADD COLUMN due_date TEXT`.
- `ALTER` is in try/catch. On `duplicate column name`, re-check PRAGMA and swallow only if the column now exists; otherwise rethrow.
- Never drops, rebuilds or deletes. Idempotent, non-destructive, no side effects at require time.

### 1.2 `backend/src/db.js`
- Add `const { migrate } = require('./migrations');`.
- Call `migrate(db)` right after the existing `CREATE TABLE IF NOT EXISTS` block (left untouched).
- `module.exports = db;` unchanged. The ENH-17 test re-requires `server`/`db` against the same `DB_PATH`; the second `migrate` is a no-op.

### 1.3 `backend/src/validation.js`
- Add `DUE_DATE_ERROR = 'due_date must be a valid date in YYYY-MM-DD format'`.
- Add `validateTaskCreateDueDate(v)` returning `{ value, error }`, no falsy-defaulting (D10):
  1. `undefined`, `null`, `""` -> `{ value: null, error: null }`.
  2. Any non-string (including `0`, `false`, array, object) -> error.
  3. String must match `^(\d{4})-(\d{2})-(\d{2})$`; parse y/m/d as integers.
  4. Month 1-12; day 1..month length. Leap rule `y%4==0 && (y%100!=0 || y%400==0)`. Year 0000 accepted under the same rule.
  5. No `new Date(string)` anywhere (NFR-5).
- Export `validateTaskCreateDueDate` and `DUE_DATE_ERROR`. `validateTaskCreateStatus` and `PATCHABLE_FIELDS` unchanged.

### 1.4 `backend/src/server.js`
- Import the new validator.
- `GET /api/tasks`: `SELECT id, title, status, due_date FROM tasks ORDER BY id DESC`.
- `POST /api/tasks`: validation order title, length, status, due_date, then INSERT. Due-date error -> `400 {error: DUE_DATE_ERROR}`, no row inserted. `INSERT INTO tasks (title, status, due_date) VALUES (?, ?, ?)`. 201 body `{ id, title, status, due_date }` (`due_date` string or `null`).
- `PATCH`: only change `RETURNING id, title, status, due_date`. A `due_date` key in the body is still rejected as an unknown field.
- `DELETE` and `/api/health` untouched.

### Phase 1 checkpoint
```powershell
Set-Location backend; node --test; Set-Location ..
```
Only expected failures: the three `deepEqual` assertions in `tasks.patch.test.js` (lines 64, 185, 203). `tasks.enhancements.test.js` and `tasks.post-status.test.js` must stay green. Any other failure is a regression: stop and fix.

## Phase 2. Frontend (ST-3)

### 2.1 New `frontend/src/dates.js` (pure ESM)
- `todayLocal(now = new Date())`: `YYYY-MM-DD` from `getFullYear()`, `getMonth()+1`, `getDate()`, zero-padded. Never `toISOString()`.
- `isOverdue(dueDate, status, today)`: `!!dueDate && status !== 'done' && dueDate < today`.

### 2.2 `frontend/src/api.js`
- `addTask(title, dueDate)` builds `{ title }` and adds `due_date` only when `dueDate` is a non-empty string. `errorMessage` needs no change.

### 2.3 `frontend/src/App.jsx`
- Import `{ todayLocal, isOverdue }`. Add `dueDate` state.
- Add form: `<label htmlFor="task-due-date">Due date (optional)</label>` and `<input id="task-due-date" type="date">`, no min/max.
- `handleAdd` calls `addTask(title, dueDate)`; clears `dueDate` only after success.
- `TaskItem`: `overdue = isOverdue(task.due_date, task.status, todayLocal())` each render.
  - `<li className={overdue ? 'overdue' : undefined}>`.
  - After the status span, render `<time className="due-date" dateTime={task.due_date}>{task.due_date}</time>` only when set.
  - When overdue, render `<span className="overdue-label">Overdue</span>`.
  - Title stays the first span (`li > span:first-child {flex:1}`). Search, edit, delete untouched.

### 2.4 `frontend/src/styles.css`
- Append `.due-date`, `.task-list li.overdue`, `.overdue-label` from the architecture. First read existing `.add-form` and `.status` rules so the date input wraps cleanly and the row layout is not broken.

### Phase 2 checkpoint
```powershell
npm run build            # must succeed
npm run dev              # manual smoke test, then stop
```
Smoke test: existing NULL-date task unchanged; add without date works; add with past date shows Overdue; delete and search still work.

## Phase 3. Tests (ST-4)

### 3.1 Update `backend/test/tasks.patch.test.js`
- Line 64 -> `{ id, title: 'Renamed', status: 'todo', due_date: null }`.
- Line 185 -> `{ id, title: 'Original', status, due_date: null }`.
- Line 203 -> `{ id, title: 'Both', status: 'done', due_date: null }`.
- Do not touch `row()` (line 47), the `deepEqual(row(id), ...)` calls, or the legacy-shape test (line 373).
- Add M4 test "PATCH returns the stored due_date": seed with `(title,status,due_date)` using `'2030-01-15'`, patch title, assert response `due_date === '2030-01-15'` and DB value unchanged; assert `PATCH {due_date}` is still rejected as an unknown field.
- `tasks.enhancements.test.js` and `tasks.post-status.test.js` need no edits (guarded by the Phase 1 checkpoint).

### 3.2 New `backend/test/tasks.due-date.test.js` (temp `DB_PATH`, same boilerplate as `tasks.post-status.test.js`)
- **Validator, valid:** `2024-02-29`, `2000-02-29`, `0000-01-01`, `9999-12-31`, `2025-12-31`, `undefined`, `null`, `""`.
- **Validator, invalid (L1, L2):** `1900-02-29`, `2025-02-30`, `2025-13-01`, `2025-00-10`, `2025-2-1`, `2025-01-01T00:00:00Z`, `" 2025-01-01"`, `"2025-01-01 "`, `"2025-01-01\n"`, `20250101`, `0`, `false`, `true`, `[]`, `{}`, `123`.
- **POST:** valid date -> 201 with same `due_date` and matching DB row; no date / `null` / `""` -> `due_date: null`; each invalid value -> 400 with exact `{ error: DUE_DATE_ERROR }` and unchanged row count; bad title plus bad date -> title error wins.
- **GET:** includes `due_date` for dated and undated rows.
- **Brownfield:** a row inserted with only `(title, status)` reads back with `due_date` null via GET.

### 3.3 New `backend/test/migrations.test.js`
- Requires `../src/migrations` and `better-sqlite3` directly (temp-file or in-memory DB); never opens `tasks.db`.
- Legacy table `(id, title, status)` including a `blocked` row; run `migrate` twice: no throw, exactly one `due_date` column, rows preserved, `due_date` NULL everywhere.
- Concurrent-start simulation: pre-add the column from another connection, then `migrate` must not throw.
- Fresh database: `CREATE TABLE`, `migrate`, insert with a date.
- One test through `db.js`: point `DB_PATH` at a seeded legacy file, clear `require.cache` for `db` and `server` (as ENH-17 does), require `db`, assert the column exists and rows survived.

### 3.4 Frontend unit tests (L4)
- New `frontend/test/dates.test.js` (ESM, `node:test`).
- `isOverdue`: past true; today false; future false; `done` with past date false; `null`/`""` false; legacy status `blocked` with past date true.
- `todayLocal`: fixed `new Date(2026, 0, 5, 23, 59)` -> `2026-01-05`; plus a timezone-independent case comparing against the local getters of a `(y, m, d, h)`-constructed `Date`.
- Root `package.json` scripts to add:
  - `"test:backend": "npm test --prefix backend"`
  - `"test:frontend": "node --test \"frontend/test/**/*.test.js\""`
  - `"pretest:bdd": "node -e \"require('fs').rmSync('tests/.tmp',{recursive:true,force:true})\""`
  - `test:bdd`, `test:search`, `test:bdd:report` unchanged.

### 3.5 Playwright/BDD scaffold (H2)
Prerequisite: `npx playwright install chromium`.

**Layout**
```
playwright.config.js
tests/bdd/features/due-date.feature
tests/bdd/steps/fixtures.js          (test = base.extend, createBdd)
tests/bdd/steps/due-date.steps.js
tests/bdd/support/api.js             (createTask/deleteTask via request)
tests/bdd/support/dates.js           (localDateOffset(n, now) using local getters)
tests/.tmp/                          (E2E database, gitignored)
tests/Test Execution & Reporting/    (html-report, test-results)
```

**`playwright.config.js`**
- `defineBddConfig({ features: 'tests/bdd/features/*.feature', steps: 'tests/bdd/steps/*.js', outputDir: '.features-gen' })` as test directory.
- `fullyParallel: false`, `workers: 1` (shared DB). `use.baseURL: 'http://localhost:5173'`. Chromium only.
- HTML reporter -> `tests/Test Execution & Reporting/html-report`; `outputDir` -> `tests/Test Execution & Reporting/test-results`.
- Two `webServer` entries with `reuseExistingServer: false` (E2E can never attach to a developer server and write into a real `tasks.db`; port conflict fails loudly; stop `npm run dev` before E2E):
  1. Backend: `command: 'node backend/src/server.js'`, `url: 'http://localhost:4000/api/health'`, `env: { PORT: '4000', DB_PATH: path.resolve('tests/.tmp/e2e.db') }`. Env set via config `env` (no inline `VAR=x cmd`, no `cross-env`). `tests/.tmp` created with `fs.mkdirSync(..., {recursive:true})` at top of config.
  2. Frontend: `command: 'npm run dev --prefix frontend'`, `url: 'http://localhost:5173'` (Vite proxy sends `/api` to 4000).
- If CommonJS loading breaks `import`, fall back to `playwright.config.mjs`; `npx bddgen` shows this immediately.

**Fixture rules (M1, M2)**
- All data created through the API (`POST /api/tasks` on `http://localhost:4000`), including `status:"done"` rows. Titles unique per scenario (`E2E <scenario> <random>`); an `After` hook deletes them through the API.
- Dates are relative via `localDateOffset` using the same local getters as `todayLocal()`; never `toISOString()`.
- Overdue and boundary scenarios use a `Given the browser clock is set to ...` step calling `page.clock.install({ time })` before navigation. The boundary scenario uses a context with `timezoneId: 'Pacific/Auckland'`, where UTC date differs from local date, so a UTC bug would show.

**`due-date.feature` scenarios**
1. Add a task with a due date via UI: shows raw `YYYY-MM-DD`, no Overdue label; date input cleared after add.
2. Add a task without a date: no date text or Overdue label (regression).
3. Past-due task (API-created) shows Overdue label and `overdue` row class.
4. `done` task with a past date is not overdue.
5. Task due today is not overdue.
6. Task due in the future is not overdue.
7. Legacy-style task with no date shows nothing.
8. Clock boundary (Scenario Outline, clock at 23:59:30 then 00:00:30 local): due on the 15th is not overdue at 23:59 on the 15th, overdue after reload at 00:00 on the 16th.
9. Invalid date rejected by API (`request.post` with `2025-02-30` -> 400, row not listed). UI error display not testable because the date input blocks invalid values.
10. Regression: add via UI then delete returns list to prior state; title search still filters.

### Phase 3 checkpoint
```powershell
Set-Location backend; node --test; Set-Location ..   # all green, count = baseline + new tests
npm run test:frontend
npx bddgen                                           # specs generated, no missing steps
npm run test:bdd                                     # servers start on temp DB, all scenarios pass
npm run test:bdd:report                              # optional: open HTML report
```
Afterwards confirm `backend\tasks.db` modified-time is unchanged from the Step 0 backup (proves the real DB was never touched).

## Verification summary

| When | Command | Expected |
|---|---|---|
| Before any change | `node --test` in `backend` | Baseline recorded |
| After Phase 1 | same | Only the 3 PATCH `deepEqual` failures |
| After Phase 2 | `npm run build`, manual smoke test | Build OK, existing flows work |
| After Phase 3 | backend `node --test`, `npm run test:frontend`, `npm run test:bdd` | All green |
| Final | Compare `backend\tasks.db` against backup (row count) | Rows preserved, `due_date` NULL for old rows |

## Rollback notes

- **Database:** the migration only adds a nullable column, so code rollback needs no DB rollback (old code lists columns explicitly and ignores the extra one). `ALTER TABLE ... DROP COLUMN due_date` is NOT part of rollback: it would destroy entered dates and needs explicit approval. If the DB is damaged, restore `tasks.db.bak` with the server stopped (including any `-wal` / `-shm` files).
- **Code:** no git, so restore from the Step 0 backup. Partial rollback phase by phase:
  - Phase 3: delete `tests/`, `playwright.config.js`, the new test files and the `package.json` scripts; revert the 3 lines in `tasks.patch.test.js`.
  - Phase 2: remove `dates.js`; revert `api.js`, `App.jsx`, `styles.css`.
  - Phase 1: revert `server.js` and `validation.js`; remove `migrations.js` and the `migrate(db)` call in `db.js`. The extra column is harmless if left.
- **Safe ordering:** each phase ends at a green checkpoint, so work can stop after any phase with a working app.

## Risks and open points

- E2E uses its own temp DB; ports 4000/5173 being occupied fails the run by design.
- `bddgen` / ESM config interaction (`.js` vs `.mjs`) is only confirmable at implementation time; the Phase 3 checkpoint catches it.
- Node 22 `--test` glob support assumed (v22.18.0 confirmed).

## Files to be touched or created

Production code:
- `backend/src/migrations.js` (new)
- `backend/src/db.js`
- `backend/src/validation.js`
- `backend/src/server.js`
- `frontend/src/dates.js` (new)
- `frontend/src/api.js`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

Tests and config:
- `backend/test/tasks.patch.test.js`
- `backend/test/tasks.due-date.test.js` (new)
- `backend/test/migrations.test.js` (new)
- `frontend/test/dates.test.js` (new)
- `package.json`
- `playwright.config.js` (new)
- `tests/bdd/` (new: features, steps, support)
- `.gitignore` (new or appended)
