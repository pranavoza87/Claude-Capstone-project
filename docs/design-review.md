# Design Review: US-101 Optional Due Date

**Status:** Approved by human reviewer
**Inputs:** `docs/requirements.md`, `docs/requirements-local.md`, `docs/architecture.md`, backend source and tests, `task-manager-app/package.json`, frontend `App.jsx` / `api.js`
**Verdict:** Pass with concerns. The architecture is sound and brownfield-safe for the backend. Two blocking items (H1, H2) must be fixed before Step 4. Neither needs a redesign.

## 1. Brownfield Regression Audit

Test paths are under `task-manager-app/backend/test/`.

### `tasks.enhancements.test.js` - no breakage
- Asserts only `{status:'ok'}` on health, `{error:'title must be at most 200 characters'}` on the title limit, and CORS headers. POST 201 checks `res.body.title.length` only.
- Hazard: the ENH-17 test deletes `require.cache` for `server` and `db`, then re-requires them against the same `DB_PATH`. This is safe only because the migration is idempotent (PRAGMA guard). Keep it idempotent and free of module-level side effects other than the guarded call.

### `tasks.post-status.test.js` - no breakage
- Checks fields individually. The error-body `deepEqual` calls cover only 400 responses, which are unchanged.
- The `row()` helper uses `SELECT id, title, status`, which stays valid after the column is added.
- The unit test on `validateTaskCreateStatus` is unaffected. The new validator must be a separate function (D10).

### `tasks.patch.test.js` - breaks, as D1 states
- Not in the original brief, but the only file with real breakage.
- Three response-body `deepEqual` calls (lines 64, 185, 203) need `due_date: null`.
- The `row()` helper (line 47) selects `id, title, status`, so the `deepEqual(row(id), ...)` assertions (lines 65, 210, 237, 300-362) stay green. Do not touch them.
- The "legacy error shape" test (line 373) stays green.
- `seed()` inserts only `(title, status)`, so seeded rows get NULL. This is a useful implicit migration check.

### Playwright / BDD layout - absent (blocking)
- No `tests/` directory, `playwright.config.*`, `.feature` files or step definitions exist outside `node_modules`.
- Root `package.json` has `test:bdd` (`bddgen && playwright test`), `test:search`, and `test:bdd:report` (path `tests/Test Execution & Reporting/html-report`), plus `@playwright/test` and `playwright-bdd` devDependencies. Scripts point at a layout that does not exist, so `npm run test:bdd` fails today.
- `architecture.md` section 6 says the layout "has not been inspected"; that open item is closed with "nothing to follow".
- Consequence: there is no existing E2E baseline for add/delete flows. ST-4 is greenfield.

## 2. Findings

### High (fix in architecture before Step 4)

**H1. `migrate` export design is ambiguous and can break every backend test.**
`db.js` ends with `module.exports = db`, and all three test files call `db.exec`, `db.prepare`, `db.close` on that export. If D9 is implemented as `module.exports = { db, migrate }`, every existing test and `server.js` breaks.
Fix: keep `module.exports = db`. Either attach `db.migrate = migrate`, or (preferred) create `backend/src/migrations.js` imported and called by `db.js`, so the migration test can require it without opening the default `tasks.db`.

**H2. E2E scaffold is missing and unspecified.**
`architecture.md` section 6 needs a concrete plan:
- `playwright.config.*` using `defineBddConfig`, with `webServer` entries for backend `:4000` and frontend `:5173`.
- A throwaway DB: backend started with `DB_PATH` set to a temp file, so E2E never touches the developer's real `tasks.db`.
- `.feature` file and step definitions at paths consistent with the `tests/Test Execution & Reporting/` report folder.
- Windows-safe `webServer` commands (no inline `VAR=x cmd`; use `cross-env` or the config `env`).
- Browser install prerequisite (`npx playwright install chromium`).

### Medium

- **M1.** Overdue E2E tests cannot create a `done` task through the UI (no mark-done UI). Create fixtures via the API (`POST` with `status:"done"` and a past `due_date`), then reload. Make "API for fixtures" the rule.
- **M2.** Test dates must be relative and built with the same local-date logic as `todayLocal()`. UTC `toISOString()` in tests would reproduce the bug the design avoids. Run a boundary case with the browser clock mocked (`page.clock` or stubbed `Date`) to avoid midnight flakiness.
- **M3.** `requirements.md` section 3.3 says PATCH is unchanged, but `requirements-local.md` FR-8 and architecture D1 add `due_date` to the PATCH response. The change is additive and well reasoned, but the approved requirements are now inconsistent. Record it as an approved deviation in the review and impl-plan, or amend section 3.3 and the FR table.
- **M4.** Add a PATCH test asserting the response carries the stored `due_date` for a task created with a date. Updating the three assertions to `due_date: null` proves only the NULL case.

### Low

- **L1.** Validator regex is safe (`/^...$/.test("2025-01-01\n")` is false in JS). Add a `"2025-01-01\n"` case to invalid-input tests anyway.
- **L2.** Add leap-year tests: `1900-02-29` (invalid), `2000-02-29` (valid), alongside `2024-02-29` and `2025-02-30`.
- **L3.** The "optional transaction" wording in section 3 promises more than it gives; concurrent starts can still throw `duplicate column name`. Wrap `ALTER` in try/catch with a PRAGMA re-check, or drop the wording.
- **L4.** Frontend `dates.js` tests: backend is CommonJS, frontend is ESM (Vite), and `node --test` from `backend/` will not discover `frontend/src` tests. Specify the test location and run command (e.g. `node --test frontend/test` from app root, or fold into the BDD run) and add the script to root `package.json`.
- **L5.** `due_date` value `__proto__` and similar: no risk (validated string, parameterized SQL). No action.
- **L6.** `.due-date` text `#555` on `#fdecea` overdue row is about 5.5:1 (passes AA). `.status` span positioning versus `li > span:first-child` is handled in section 5. No action.

## 3. Checklist Results

| Area | Result |
|---|---|
| FR/AC/NFR coverage | Pass. AC1-AC4 all mapped. ID mismatch between the two requirements files noted (M3). |
| `due_date = NULL` compatibility, non-destructive migration | Pass. Additive `ALTER`, idempotent, no drop/rebuild/delete. |
| Existing view, add, delete | Pass. DELETE and health untouched. POST without a date behaves as before apart from extra `due_date: null`. |
| API contract changes | Additive only: `due_date` added to GET, POST 201, PATCH 200. No in-repo test does a strict body match except the three in `tasks.patch.test.js`. |
| Input validation and security | Pass. Parameterized SQL, type check before regex, no `new Date(string)`, falsy trap addressed (D10), PATCH column names from a fixed list. |
| Timezone and overdue logic | Pass. Local-date helper and string comparison; midnight staleness accepted (D11). |
| Testability | Concerns. Backend good with H1 fix. E2E scaffold missing (H2), plus M1, M2. |

## 4. Action Items for Step 4 (impl-plan)

1. Fix the `migrate` export (H1): `migrations.js` or `db.migrate`, with `module.exports = db` unchanged.
2. Add an E2E scaffold sub-task: config, `webServer`, temp `DB_PATH`, browser install, folder layout, `.feature` and steps (H2).
3. Update the three `deepEqual` lines in `tasks.patch.test.js` (64, 185, 203); add a PATCH test for non-null `due_date` (M4). Leave `row()` and the other `deepEqual(row(id))` calls alone.
4. Create E2E fixtures via API with relative local dates; mock the clock for the boundary case (M1, M2).
5. Record the PATCH response deviation in the docs (M3).
6. Specify where `dates.js` tests run and the script that runs them (L4); add extra validator cases (L1, L2); tighten migration concurrency wording (L3).
7. Run the full existing backend suite (`node --test` in `backend`) before and after the change as the regression gate.
