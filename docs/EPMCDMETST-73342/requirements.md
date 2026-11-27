# Requirements: EPMCDMETST-73342

Status: APPROVED v2 (Phase 1 redone from scratch; human approval "Approved, use the draft defaults" on 2026-11-23). Not committed. Decisions are in section 9.
Source: Jira EPMCDMETST-73342, fetched via mcp__jira__jira_get_issue on 2026-11-23. Type Story, status Open, priority Low, reporter Pranav Oza, unassigned, no comments, no worklogs. Branch: feature/EPMCDMETST-73342-overdue-filter.

## 1. User Story
US-102: Add quick filter toggle for overdue tasks in Task Manager.

As a user of the Task Manager application, I want a toggle or filter option to view only overdue tasks so I can quickly focus on tasks past their due date without cluttering the full task list.

## 2. Acceptance Criteria (verbatim from Jira)
- AC1: A filter control in the Task Manager UI allows toggling between showing all tasks and showing only overdue tasks.
- AC2: When the overdue filter is active, only tasks marked overdue are displayed; toggling it off restores the standard task view.
- AC3: Existing task creation, completion, and optional due-date behaviors remain intact without altering tracked backend/tasks.db during automated tests.
- AC4: Automated tests cover the overdue filter behavior alongside existing unit/E2E test suites.

## 3. Current Behavior (verified in repo files)
- `backend/src/server.js`: `GET /api/tasks` returns `id, title, status, due_date` ordered by id DESC. POST accepts title, optional status, optional due_date. PATCH accepts title/status via validator. DELETE by id. No query-string filtering exists.
- `backend/src/db.js`: table `tasks(id, title, status)`, `due_date` added by `migrate(db)` from `migrations.js`. DB path comes from `DB_PATH` env var, default `backend/tasks.db`.
- `frontend/src/dates.js`: `isOverdue(dueDate, status, today)` = has due date AND status !== 'done' AND dueDate < today (string compare). `todayLocal()` uses browser-local date.
- `frontend/src/App.jsx`: each `TaskItem` calls `isOverdue` and renders an "Overdue" label and `overdue` class. `visibleTasks` filters only by title search (`searchQuery`). Empty message "No tasks yet." shows only when the whole task list is empty. The UI has no status-change control (status is only set at creation or via the API); the only per-row actions are Edit (title) and Delete.

## 4. Functional Requirements
- FR-1 (AC1): Add a labeled, keyboard-operable toggle (native checkbox or button with `aria-pressed`) in `App.jsx`, near the search control, e.g. "Show overdue only". Default is off (all tasks shown).
- FR-2 (AC2): When on, show only tasks where the existing `isOverdue(task.due_date, task.status, todayLocal())` is true. When off, restore the standard list.
- FR-3: No second definition of overdue. The filter reuses `isOverdue` so the filter and the "Overdue" label cannot disagree.
- FR-4: The filter composes with title search: visible = matches search AND (filter off OR overdue).
- FR-5: Client-side only. No new endpoint or query parameter (GET /api/tasks already supplies `due_date` and `status`). Decided (Q1).
- FR-6: When the filter is on and no task qualifies, show the explicit empty-state message "No overdue tasks.", distinct from "No tasks yet." (which keeps its current condition). Decided (Q5).
- FR-7 (AC3): Create (with optional due date), edit title, and delete behave exactly as today. Filter state survives add, delete, and edit reloads.
- FR-8 (AC4): New tests in existing suites (section 7).
- FR-9 (NOT included): Overdue count on the toggle is optional and outside AC1-AC4; excluded by default (Q2).
- FR-10: Filter state is not persisted; resets to off on reload. Decided (Q3).
- AC3 interpretation: "completion" means preserve existing status behavior only; no new complete control is added (Q4).

## 5. Edge Cases
- No due date: never overdue, hidden when filter on.
- Due today: not overdue. Due yesterday or earlier with status not `done`: overdue.
- Past due with status `done`: not overdue. Any other status string (`todo`, `in_progress`, unexpected values) is treated as not done, per the helper.
- Task added with a past due date while filter on: appears after the post-add reload.
- Overdue task deleted while filter on: removed; empty state if it was the last.
- Filter plus a search that matches nothing: empty state.
- Tab left open past midnight: overdue set updates on next render, same as the existing label.
- Timezone: browser-local date, consistent with the existing helper.
- Malformed rows: `visibleTasks` already drops entries lacking id or string title; keep that guard.

## 6. Non-Functional / Safety Constraints
- Brownfield: preserve viewing, adding, deleting, and title editing (CLAUDE.md rule 3).
- SQLite: no schema change expected. Any schema change must be an idempotent, non-destructive migration; never drop or wipe data.
- Tests must not alter tracked `task-manager-app/backend/tasks.db`, `tasks.db-shm`, `tasks.db-wal` (all three are tracked per `git ls-files`). Use `DB_PATH` pointing to a temp file, as backend tests are expected to; verify how existing tests and the Playwright server config isolate the DB before adding new ones.
- Do not stage or commit `docs/codemie/analytics/*.json` (rules file).
- Accessibility: label, keyboard operation, state exposed to assistive tech.
- Windows/PowerShell-compatible commands.

## 7. Test Requirements (AC4)
Existing suites found in repo: backend node tests (`backend/test/*.test.js`, `npm run test:backend`), frontend unit (`frontend/test/dates.test.js`, `npm run test:frontend`), BDD/Playwright (`tests/bdd/features/due-date.feature`, `steps/`, `support/`; `npm run test:bdd`). Tests were not run for this draft, so no counts are claimed.
- Because the filter reuses `isOverdue`, pure-logic coverage is already in `dates.test.js`; if the filter predicate is extracted to a helper, add unit tests for it (on/off, search combination, done, null, today boundary).
- Add BDD scenarios: toggle on shows only overdue; toggle off restores all; empty state; filter plus search; add/delete while filter on keeps state.
- No backend test change is required unless FR-5 changes.

## 8. Out of Scope
- Changing the definition of overdue or due_date format/validation.
- Server-side filtering, new or changed API endpoints or error contracts.
- Editing due_date via PATCH.
- Other filters (status, date range), sorting, persistence of filter.
- A new "complete" button or status-change UI (see Q4).
- Untracking `tasks.db` files from git.
- Schema changes or data migration.

## 9. Resolved Decisions (draft defaults accepted)
1. Client-side-only filtering, no API query parameter: YES.
2. Overdue count on the toggle: NO (excluded; revisit later if wanted).
3. Filter resets to off on reload (no persistence): YES.
4. AC3 "completion" = preserve existing status behavior only; no new complete control: YES.
5. Filter-on empty-state wording: "No overdue tasks."
