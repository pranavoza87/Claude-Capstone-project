# Requirements: US-101 — Add Due Dates to Tasks

- **Jira:** EPMCDMETST-73253 (https://jiraeu.epam.com/browse/EPMCDMETST-73253)
- **Epic:** Task Scheduling & Deadlines
- **Status:** Approved by user (Step 1, requirements)
- **Source:** Jira story, `docs/user-story.md`, review of existing backend and frontend code

## 1. Goal

Let users assign an optional due date to a task when creating it, see due dates on the task list, and spot overdue tasks at a glance.

## 2. Current State (Brownfield)

- **Schema (`backend/src/db.js`):** `tasks(id INTEGER PK AUTOINCREMENT, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'todo')`, created with `CREATE TABLE IF NOT EXISTS`, WAL mode. There is no migration mechanism.
- **API (`backend/src/server.js`):**
  - `GET /api/tasks` returns `id, title, status`, ordered by `id DESC`.
  - `POST /api/tasks` validates title and status. It returns 201 with `{id, title, status}`. Errors use the legacy shape `{ error: "text" }`.
  - `PATCH /api/tasks/:id` accepts only `title` and `status`, rejects unknown fields, and uses the envelope error shape `{error:{code,message,details}}`.
  - `DELETE /api/tasks/:id` returns 204, or 404.
- **Status values (`validation.js`):** `todo`, `in_progress`, `done`.
- **Frontend:** the add form has a title input only. Each task shows its title, a status label, and Edit and Delete buttons. There is a client-side title search and inline title edit. There is no date handling, no overdue style, and no UI to set a task to `done`.

## 3. Decisions and Assumptions

1. **Validation:** `due_date` must be a real calendar date string in strict `YYYY-MM-DD`. Timestamps, padded whitespace and other formats are rejected. `null`, omitted or `""` means no due date, stored as NULL. Any other non-string value returns 400.
2. **Past dates:** allowed on creation. Overdue is computed client-side only, using the browser's local date. There is no server-side overdue logic.
3. **Editing:** the due date is create-only in this story. `PATCH` is unchanged and still rejects unknown fields.
4. **Completed:** `status = 'done'` means completed. No mark-done UI is added in this story.
5. **Display:** show the raw `YYYY-MM-DD` next to each task. Tasks with no due date show nothing. Overdue tasks get a colour highlight and a visible "Overdue" text label.
6. **Error shape:** invalid-date errors on `POST` use the existing legacy shape `{ error: "..." }`.
7. **Tests:** reuse existing tooling. Backend uses `node --test`. Frontend uses Playwright and playwright-bdd E2E (`npm run test:bdd`). Vitest is not added.
8. **Date input limits:** no min or max on the date input. Years 0000 through 9999 are syntactically valid.

## 4. Functional Requirements

| ID | Requirement | AC | Sub-task |
|---|---|---|---|
| FR-1 | The add form has an optional date input. The client sends `due_date` as `YYYY-MM-DD` only when a date is chosen. | AC1 | ST-3 |
| FR-2 | An idempotent migration runs at startup in `db.js`. It checks `PRAGMA table_info(tasks)` and, if `due_date` is missing, runs `ALTER TABLE tasks ADD COLUMN due_date TEXT`. It never drops, recreates or wipes the table or rows. Existing rows get `due_date = NULL`. Running it repeatedly is safe. | AC2 | ST-1 |
| FR-3 | `POST /api/tasks` accepts an optional `due_date`. A valid value is a strict, real-calendar `YYYY-MM-DD` string. `null`, omitted or `""` is stored as NULL. Any other value returns 400 with `{ "error": "..." }`. Validation runs before any insert. The 201 response includes `due_date` (string or null). | AC3 | ST-2 |
| FR-4 | `GET /api/tasks` returns `due_date` for each task as `YYYY-MM-DD` or `null`. GET has no input to validate. | AC2, AC3 | ST-2 |
| FR-5 | Each task shows its raw `YYYY-MM-DD` due date next to the title. Tasks with no due date show nothing. | AC4 | ST-3 |
| FR-6 | A task is overdue when `due_date` is before today (browser local date) and `status !== 'done'`. Overdue tasks get a colour highlight and an "Overdue" text label. Done tasks are never overdue. Tasks due today are not overdue. | AC4 | ST-3 |
| FR-7 | Existing view, add, delete, inline title edit and search keep working. Adding a task without a due date behaves as it does today. | Brownfield rule | ST-1 to ST-3 |

## 5. Non-Functional Requirements

- **NFR-1:** No data loss and no schema rebuild.
- **NFR-2:** Overdue status is not conveyed by colour alone.
- **NFR-3:** Existing error shapes are unchanged (legacy on POST, envelope on PATCH).
- **NFR-4:** All commands and scripts work on Windows and PowerShell.
- **NFR-5:** Date validation is deterministic and independent of server timezone. It parses the string parts directly and does not use `new Date(string)`.

## 6. Test Requirements (ST-4)

**Backend (`node --test`, new file `backend/test/tasks.due-date.test.js`, temporary database via `DB_PATH`):**
- Valid date, omitted, `null` and `""`.
- Invalid values: `2026-02-30`, a timestamp, padded whitespace, a number and an object.
- `GET` returns `due_date` or null.
- Migration on a legacy-schema database with existing rows, run twice, with rows preserved.
- `PATCH` still rejects `due_date` as an unknown field.
- Existing tests still pass.

**Playwright E2E (`npm run test:bdd`):**
- Add a task with a due date and see it displayed.
- An overdue task shows the "Overdue" label.
- A task due today or in the future is not marked overdue.
- A task with no due date shows nothing.
- Existing add and delete flows still work.

The overdue check should be a small pure function so it is easy to test.

## 7. Out of Scope

- Editing or clearing a due date (possible follow-up).
- A mark-done UI.
- Sorting or filtering by due date.
- Server-side overdue logic, timezone settings, reminders and notifications.
- Rejecting past dates.
- Changes to existing error shapes.

## 8. Traceability

| Acceptance criterion | Requirements | Sub-task |
|---|---|---|
| AC1: optional due date in the React UI | FR-1 | ST-3 |
| AC2: existing tasks keep working with `due_date = NULL` | FR-2, FR-4, FR-7 | ST-1, ST-2 |
| AC3: API validates `YYYY-MM-DD` and returns 400 | FR-3, FR-4 | ST-2 |
| AC4: UI shows due date and highlights overdue | FR-5, FR-6 | ST-3 |
| Automated tests | Section 6 | ST-4 |
