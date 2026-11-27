# Release Notes: US-101 Optional Task Due Dates

- **Jira:** EPMCDMETST-73253
- **Epic:** Task Scheduling & Deadlines
- **Branch:** `feature/us-101-due-dates`
- **Status:** Code review approved (no Critical issues)

## Summary

Users can now set an optional due date when creating a task. The task list shows the date next to the title. A task past its due date, and not done, is highlighted and labelled "Overdue". Existing tasks, and the view, add, delete, search and inline-edit flows, are unchanged.

## What's new

### API

- `POST /api/tasks` accepts an optional `due_date`.
  - Valid value: a real calendar date as a strict `YYYY-MM-DD` string (for example `2024-02-29`).
  - `null`, omitted or `""` stores no date (NULL).
  - Anything else returns `400` with the legacy error shape `{ "error": "due_date must be a valid date in YYYY-MM-DD format" }`. No row is created. This covers `2025-02-30`, `2025-2-1`, timestamps, padded whitespace, numbers (including `0`), booleans, arrays and objects.
  - Validation runs after title and status checks and before the insert. Title/status errors take precedence.
  - Date validation parses the string parts and does not use `new Date(string)`, so it does not depend on server timezone. Years 0000 to 9999 are accepted.
- `GET /api/tasks` returns `due_date` (`YYYY-MM-DD` or `null`) for every task.
- `PATCH /api/tasks/:id` still accepts only `title` and `status`. A `due_date` key is still rejected as an unknown field (`400`, envelope error shape). The `200` response now also includes `due_date` so a title edit does not hide the date. This differs from the original requirement text ("PATCH unchanged") and was an approved deviation.
- `DELETE /api/tasks/:id`, `GET /api/health` and all existing error shapes are unchanged.

### Database (non-destructive migration)

- A new `due_date TEXT` column (nullable) is added to `tasks` at startup by `migrate(db)` in `backend/src/migrations.js`, called from `backend/src/db.js`.
- The migration checks `PRAGMA table_info(tasks)` and runs `ALTER TABLE tasks ADD COLUMN due_date TEXT` only if the column is missing. It is idempotent and tolerates a concurrent duplicate-column error.
- No DROP, table rebuild or DELETE. The original `CREATE TABLE IF NOT EXISTS` is untouched. Existing rows, including legacy rows with non-standard statuses such as `blocked`, keep their data and get `due_date = NULL`.
- There is no CHECK constraint on the column (SQLite `ALTER` cannot add one). The API layer enforces the format.
- No manual step is needed. Start the backend and the column is added.

### UI

- The add form has a labelled optional "Due date (optional)" date input (`<label for="task-due-date">`). The client sends `due_date` only when a date is chosen. The input is cleared after a successful add and kept if the add fails. A server validation error is shown in the existing error area.
- Each task with a due date shows it in raw `YYYY-MM-DD` form in a `<time>` element, after the title. Tasks with no date show nothing.
- Overdue behavior:
  - A task is overdue when `due_date` is before today and `status !== 'done'`.
  - "Today" is the browser's local date (not UTC). A task due today is not overdue, and a done task is never overdue.
  - Overdue rows get a red background, a left border and a visible, screen-reader-readable "Overdue" text label, so colour is not the only cue.
  - Overdue is computed on the client at render time. There is no server-side overdue logic.
- New frontend helpers in `frontend/src/dates.js`: `todayLocal()` and `isOverdue(dueDate, status, today)`.

## Not included (out of scope)

- Editing or clearing a due date after creation.
- A mark-done UI (status `done` can be set through `PATCH`).
- Sorting or filtering by due date.
- Server-side overdue logic, timezone settings, reminders, notifications, locale-formatted dates.
- Rejecting past dates (a task can be overdue the moment it is created, by design).

## Known limitations

- A browser tab left open past midnight shows stale overdue state until the next render or reload.
- Users in different timezones can see different overdue results, because it uses the browser's local date.
- Browsers can emit six-digit years in a date input (for example `20255-01-01`). The server returns `400` and the UI shows the error. No min/max is set on the input by design.
- Two backend processes starting at the same moment is a low risk for the migration. The code tolerates a duplicate-column error.

## Verification

Results as recorded in `docs/code-review.md` (reviewer's run):

| Suite | Command (in `task-manager-app/`) | Result |
|---|---|---|
| Backend | `npm run test:backend` (`node --test`) | 122 pass, 0 fail |
| Frontend unit | `npm run test:frontend` | 10 pass, 0 fail |
| BDD E2E | `npm run test:bdd` (bddgen + Playwright, temp DB) | 11 of 11 pass |

- The E2E run used a throwaway database. The tracked `backend/tasks.db` was untouched.
- Not run by the reviewer: `npm run build` and the manual smoke test.
- Existing assertions were not weakened. The three `deepEqual` checks in `backend/test/tasks.patch.test.js` only gained `due_date: null`.
- All four acceptance criteria (AC1 to AC4) and the automated-test requirement were traced to code and tests and marked Met.

## Files changed (22)

- Backend: `src/db.js`, `src/migrations.js` (new), `src/server.js`, `src/validation.js`; tests `migrations.test.js` (new), `tasks.due-date.test.js` (new), `tasks.patch.test.js` (updated).
- Frontend: `src/App.jsx`, `src/api.js`, `src/dates.js` (new), `src/styles.css`; test `test/dates.test.js` (new).
- E2E: `playwright.config.js` (new), `tests/bdd/features/due-date.feature`, `tests/bdd/steps/due-date.steps.js`, `tests/bdd/steps/fixtures.js`, `tests/bdd/support/api.js`, `tests/bdd/support/dates.js` (all new).
- Root `package.json`: new scripts `test:backend`, `test:frontend`, and a `pretest:bdd` cleanup of `tests/.tmp`.
- Process/docs: `docs/code-review.md`, `.claude/agents/step5-implementation.md`, `.claude/agents/step6-code-review.md`.

## Parked polish items (optional, not applied, none block release)

1. Confirm human approval for commit `eb21fa2` (CLAUDE.md rule 1) or note it in the PR description.
2. Remove `.claude/agents/step5-implementation.md` from the feature commit, or split it out (tooling unrelated to US-101).
3. Amend `docs/requirements.md` section 3, decision 3 to record the PATCH response change. Correct the stale "no git repo" and "rollback from backup" text in `docs/impl-plan.md`.
4. Merge the duplicate `.add-form` CSS selector blocks in `styles.css` and reformat the three appended one-line rules (`.75rem` vs `0.75rem`, multi-line style).
5. Add a small `api.js` test that an empty date is omitted from the payload, and a test that the date input is kept after a failed add.
6. Add a comment or allowlist for the interpolated `PRAGMA table_info(${table})` in `migrations.js` (safe today; the only caller passes the constant `tasks`).
