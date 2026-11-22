# Design Review: EPMCDMETST-73342 (Overdue quick filter)

Status: APPROVED with recommendations (Phase 3 gate, human approval "Approved, use your recommendations", 2026-11-23). Not committed.
Inputs: docs/EPMCDMETST-73342/requirements.md (APPROVED v2), docs/EPMCDMETST-73342/architecture.md (APPROVED at Phase 2 gate; amended per R1-R5 below).
Method: static review of repo files only by step3-design-review. No tests were run, so no counts are claimed. Nothing was run against backend/tasks.db.
Files read: frontend/src/{App.jsx,dates.js,api.js,styles.css}, frontend/test/dates.test.js, backend/src/{db.js,migrations.js,server.js,validation.js}, backend/test/*.test.js (DB setup and assertion shapes), playwright.config.js, tests/bdd/{features/due-date.feature,steps/due-date.steps.js,steps/fixtures.js,support/api.js,support/dates.js}, package.json, .gitignore.
Authoring note: the subagent declined to write this file before human approval; the orchestrator wrote it from the subagent's returned draft after approval.

## 1. Verdict
PASS WITH CONCERNS. No Blocker or High findings. Four Medium findings required amendments to architecture.md; none need code changes now.

## 2. Requirement coverage
| Req | Covered by architecture | Result |
|---|---|---|
| AC1 / FR-1 | Native checkbox "Show overdue only" in search-form, default off | Pass, see M1 (CSS) |
| AC2 / FR-2, FR-3 | filterTasks reuses isOverdue(due_date, status, today) | Pass, see L1 (contract) |
| FR-4 | Search AND (off OR overdue) inside helper | Pass |
| FR-5 | No API change; GET /api/tasks already returns due_date and status (server.js) | Pass |
| FR-6 | "No overdue tasks." gated by hasLoadedTasks, tasks.length > 0, visibleTasks.length === 0 | Pass, see M4, N2 |
| FR-7 / AC3 | load() only replaces tasks; overdueOnly/searchQuery live in App | Pass (verified in App.jsx) |
| FR-8 / AC4 | Unit tests for helper; BDD scenarios | Pass, see M2, M3, M4 |
| FR-9, FR-10 | No count, no persistence | Pass |

## 3. Brownfield and regression audit (grounded in repo files)
- Backend tests: tasks.enhancements, tasks.post-status, tasks.patch, tasks.due-date and migrations tests each point DB_PATH at an os.tmpdir() temp directory (mkdtempSync) before requiring the app. The change is frontend-only, so no backend response shape changes. Result: no impact.
- Frontend unit: dates.test.js imports only todayLocal and isOverdue. Adding a named export does not affect it. dates.js has no JSX or DOM dependency, so node:test can import filterTasks. Result: no impact.
- BDD: existing steps locate elements by placeholder "New task title", label "Due date (optional)", label "Search tasks by title", button name "Add" (exact) and ul.task-list li. A checkbox labelled "Show overdue only" collides with none of them. "the task is not marked overdue" asserts inside the row only. Result: no regression expected.
- Schema and data: migrate() (migrations.js) is idempotent and no migration is added. Rows with due_date NULL are never overdue. Result: pass.
- tasks.db isolation: backend/tasks.db, -shm and -wal are tracked. playwright.config.js sets DB_PATH to tests/.tmp/e2e.db with reuseExistingServer: false; pretest:bdd removes tests/.tmp; tests/.tmp/ is gitignored. Running the dev server or npm start without DB_PATH would modify the tracked files, so manual verification must set DB_PATH or use the Playwright run. The guard-tasks-db PreToolUse hook blocked a command naming the database file during this review.
- Midnight/timezone: todayLocal() uses local getters; filter and label call it per render. A tab left open does not re-render at midnight (accepted in requirements section 5).
- Search interaction: visibleTasks lowercases searchQuery and applies includes() with no trim. The helper must keep exactly that behavior (L1).
- Empty state: "No tasks yet." keeps hasLoadedTasks && tasks.length === 0. The new message requires tasks.length > 0, so they are mutually exclusive. Filter on plus an empty DB shows "No tasks yet." (affects test design, M4).

## 4. Findings

### Medium
- M1 (styles.css): `.search-form input { box-sizing:border-box; padding:.5rem; width:100% }` applies to the new checkbox. A scoped override such as `.search-form input[type='checkbox'] { width:auto; padding:0 }` is required, plus a visual check.
- M2 (BDD, add while filtered): the existing addViaUi helper ends with expect(row(world)).toBeVisible(), which fails for a task hidden by the filter. A new step adds via the UI with a due date N days ago.
- M3 (BDD, step coverage): more new steps are needed than section 7 listed (seed a labelled task with status and due date, assert a title-scoped row is absent, assert "No tasks yet." absent). `row` and `seed` are module-private in due-date.steps.js; duplicate step texts across files cause playwright-bdd ambiguity. Reuse existing step texts verbatim.
- M4 (BDD isolation and empty state): (a) the "No overdue tasks." scenario must seed at least one non-overdue task; (b) "only the {string} task is listed" counts all rows and stale rows may exist in the shared E2E DB, so use title-scoped assertions; (c) `npm run test:search` skips pretest:bdd and bddgen, so run new scenarios via `npm run test:bdd`.

### Low
- L1 (helper contract): signature `filterTasks(tasks, query, overdueOnly, today)`; query lowercased with no trim; existing guard kept verbatim; returns a new array; no mutation.
- L2 (cohesion): dates.js is headed "Pure date helpers (US-101)". Decision: keep filterTasks in dates.js (approved placement; update the header comment).
- L3 (a11y): the new empty message is not announced. Decision: add role="status".
- L4 (UX): a task added with no due date or a future date disappears while the filter is on. Decision: accept; no hint.

### Nit
- N1: section 6 omitted PATCH 413 PAYLOAD_TOO_LARGE and 500 INTERNAL_ERROR (documentation only).
- N2: "No overdue tasks." is slightly misleading when search is the cause. Decision: keep the approved wording.

## 5. Resolved decisions (recommendations accepted)
1. New scenarios go in a new `tests/bdd/features/overdue-filter.feature` (not appended to due-date.feature).
2. Silent disappearance of a newly added non-overdue task while the filter is on is accepted; no hint.
3. Keep "No overdue tasks." even when search caused the empty list.
4. Keep `filterTasks` in `frontend/src/dates.js`.
5. Add `role="status"` to the new empty message.

## 6. Required changes to architecture.md (applied)
R1 scoped checkbox CSS override and manual visual check; R2 enumerated new BDD steps; R3 empty-state scenario and isolation guidance; R4 filterTasks contract; R5 section 6 PATCH 413/500 and section 9 update.

## 7. Test plan check (AC4)
- Unit: filterTasks on/off, search combination, done, null due date, today boundary, malformed row (null entry, missing id, non-string title).
- BDD (mocked clock and API seeding): toggle on shows only overdue; toggle off restores all; empty state with a non-overdue task seeded; filter plus search; add (past due date) and delete while filtered.
- Backend: no new tests (no backend change).
- Manual: visual check of checkbox layout; run only with DB_PATH set to a temp file.
