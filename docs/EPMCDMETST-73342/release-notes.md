# Release Notes: EPMCDMETST-73342 Overdue quick filter (US-102)

- **Jira:** EPMCDMETST-73342 (Story, Low priority)
- **Branch:** `feature/EPMCDMETST-73342-overdue-filter` (base HEAD `b0e61a5`)
- **Status:** Phase 7 approved (2026-11-23: "Approved, use your recommendations"). Code review approved with recommendations (Phase 6). Changes are not committed yet. The manual visual check is PENDING (see Verification).
- **Authoring note:** drafted by step7-docs-release-notes, which wrote no files before approval; the orchestrator wrote this file and the README edits after approval.

## Summary

The task list has a new "Show overdue only" checkbox. When it is on, the list shows only overdue tasks. When it is off, the normal list returns. The change is frontend-only. There is no API, database or backend change.

## What's new

### UI
- A native checkbox labelled "Show overdue only" sits in the search area, below the search input. It is off by default. Because it is a native checkbox with a `<label htmlFor>`, it works with the keyboard and exposes its state to assistive technology.
- The filter shows exactly the tasks that already get the "Overdue" label. A task is overdue when it has a due date, its status is not `done`, and the due date is before today in the browser's local date. A task due today is not overdue. Tasks with no due date, a future date, or status `done` are hidden while the filter is on.
- The filter combines with the title search: a task is shown only if it matches the search text and, when the filter is on, is overdue.
- When the filter is on, tasks exist, and none are shown (no overdue task, or the search matches none), the page shows "No overdue tasks." (`role="status"`). "No tasks yet." keeps its old condition (the task list is empty), and the two messages never show together.
- The filter state is not saved. It resets to off on reload. No overdue count is shown on the toggle.
- Adding, deleting and editing tasks keep the filter and the search text, because the reload only replaces the task list.

### Code
- `frontend/src/dates.js`: new pure helper `filterTasks(tasks, query, overdueOnly, today)`. It lowercases the query without trimming and keeps the existing malformed-row guard. It reuses `isOverdue` as the only definition of overdue, so the filter and the row label cannot disagree. It returns a new array and does not change its input. The file's header comment was updated.
- `frontend/src/App.jsx`: new `overdueOnly` state, the checkbox, and the empty-state message. `visibleTasks` now calls `filterTasks`.
- `frontend/src/styles.css`: scoped rules `.search-form .filter-toggle` and `.search-form input[type='checkbox']`, so the checkbox does not inherit the full-width input style.

### API and database
- No API contract change. `GET /api/tasks` already returns `due_date` and `status`, and no query parameter was added.
- No schema change and no migration. The existing idempotent `due_date` migration from US-101 is unchanged. No rows are touched and no data is dropped.

## Tests added
- Frontend unit tests (`frontend/test/dates.test.js`): 10 new tests (20 total, baseline 10).
- BDD (Playwright) in the new file `tests/bdd/features/overdue-filter.feature`, with steps in `tests/bdd/steps/overdue-filter.steps.js`: 7 new scenarios. They cover default off, on, off again, the empty state, combining with search, adding while on, and deleting while on.
- No backend tests were added, because the backend did not change.

## Verification
Results are from the Phase 6 reviewer's re-run, as recorded in `docs/EPMCDMETST-73342/code-review.md`. The implementer's Phase 4 run gave the same counts.

| Check | Command (in `task-manager-app/`) | Result |
|---|---|---|
| Frontend unit | `npm run test:frontend` | 20 tests, 20 pass, 0 fail |
| Backend | `npm run test:backend` | 122 tests, 122 pass, 0 fail |
| BDD E2E | `npm run test:bdd` | 18 passed (11 existing due-date scenarios and 7 new) |
| Build | `npm run build` | Succeeded |

- `git status --porcelain -- task-manager-app/backend` was empty, so there is no backend change.
- BDD runs use a temporary database (`tests/.tmp/e2e.db`). The tracked `backend/tasks.db` files were not touched.
- **Manual visual check of the checkbox layout: PENDING.** It is not yet confirmed. The CSS specificity was reviewed, but the layout has not been seen rendered. The code review requires this check before the PR, run by the user with `DB_PATH` set to a temp file. Update this line once the check is done.

## Acceptance criteria
AC1 to AC4 were traced to code and tests in the code review and marked Pass (AC3 and AC4 rest on the counts above). AC1's visual layout is still subject to the pending manual check.

## Accepted behavior
- A task added while the filter is on, with no due date or a future due date, disappears from the list after the add, with no hint. This is accepted (design-review L4). The scenario for it is not automated (code-review N5).

## Not included (out of scope)
- Server-side or API filtering, other filters (status, date range), sorting, saving the filter, an overdue count.
- A "complete" or status-change control.
- Any change to the definition of overdue.

## Known limitations
- The overdue set is recomputed on each render. A tab left open past midnight updates on the next render, like the existing label.
- Overdue uses the browser's local date, so users in different timezones can see different results.

## Files changed
- Modified: `task-manager-app/frontend/src/App.jsx`, `frontend/src/dates.js`, `frontend/src/styles.css`, `frontend/test/dates.test.js`, `task-manager-app/README.md`.
- New: `task-manager-app/tests/bdd/features/overdue-filter.feature`, `task-manager-app/tests/bdd/steps/overdue-filter.steps.js`.
- Docs: `docs/EPMCDMETST-73342/` (SDLC artifacts, to be committed deliberately).

## Parked follow-ups (optional, no code change in this story)
- L2: `role="status"` is on an element that only mounts when the empty state appears. Some screen readers announce live regions reliably only if the container already exists. Possible fix: an always-rendered `<p role="status">` whose text changes.
- L3: The empty state is tested only together with a search term. Add a scenario with the filter on, tasks present, none overdue, and no search.
- Nits (N1 to N5 in the code review): duplicate unit-test cases, the partly self-referential drift-guard test, `hasText` substring matching in BDD helpers, the `dates.js` filename now covering more than dates, and the missing scenario for the silent-hide behavior.

## Before commit or PR
- Do not stage `docs/codemie/analytics/*.json` or `.claude/hooks/subagent-audit.log`.
- Any commit, push or PR needs separate explicit approval.
