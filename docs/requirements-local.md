# Requirements: US-101 Optional Task Due Date

- **Source:** `docs/user-story.md` (US-101, EPIC: Task Scheduling & Deadlines)
- **Status:** Approved by human reviewer
- **Scope:** `task-manager-app/` (Express + SQLite backend, React + Vite frontend)

## 1. Summary

A user can optionally set a due date (`YYYY-MM-DD`) when creating a task and see it in the task list. Overdue tasks (due date before today and status not `done`) are highlighted. Existing tasks keep working with `due_date = NULL`.

Note: the story says "completed"; the existing status values are `todo`, `in_progress` and `done`. "Completed" is defined as `done`.

## 2. Clarification Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | GET validation (AC3) | `GET /api/tasks` only returns `due_date`. It has no input, so validation applies to `POST` only. |
| 2 | Date strictness | Only real calendar dates in exactly `YYYY-MM-DD`. `null`, `""` and omitted store NULL. Non-strings return 400. Past dates are allowed. |
| 3 | "Today" for overdue | The browser's local calendar date, compared as `YYYY-MM-DD` strings. |
| 4 | "Completed" and accessibility | Completed = `done`. Overdue is shown with a text label as well as color. |
| 5 | Scope | Edit due date: out. Sort by due date: out. `due_date` in `PATCH` response: in. Invalid `POST` date uses the legacy error shape. UI shows raw ISO. |

## 3. Functional Requirements

### Data (ST-1, AC2)
- **FR-1:** Add a nullable `due_date TEXT` column to `tasks`. Use a guarded `ALTER TABLE ... ADD COLUMN`, run only when `PRAGMA table_info(tasks)` shows the column is missing.
- **FR-2:** The migration is idempotent and runs on server start. It never drops, recreates or rewrites the table. Existing rows are preserved with `due_date = NULL`.
- **FR-3:** A fresh database is created with the column. An existing database is upgraded in place.

### API (ST-2, AC3)
- **FR-4:** `POST /api/tasks` accepts an optional `due_date`.
  - Omitted, `null` and `""` store NULL.
  - Any other value must be a string in exactly `YYYY-MM-DD` that is a real calendar date. `2024-02-29` is valid. `2025-02-30`, `2025-2-1`, timestamps and strings with surrounding whitespace are invalid.
  - Non-string values (number, boolean, object, array) return 400.
  - Past dates are allowed.
- **FR-5:** An invalid `due_date` returns 400 with `{ "error": "due_date must be a valid date in YYYY-MM-DD format" }`. No row is inserted. Existing title and status validation keep their behavior and order.
- **FR-6:** The `POST` 201 response returns `{ id, title, status, due_date }`, with `due_date` as a string or `null`.
- **FR-7:** `GET /api/tasks` returns `due_date` (string or `null`) in every row. It takes no new input and does no validation. Order stays `id DESC`. (AC3 wording: `GET` has no input to validate, so it only returns `due_date`.)
- **FR-8:** The `PATCH /api/tasks/:id` response includes `due_date`. `PATCH` still accepts only `title` and `status`; `due_date` in a `PATCH` body is still rejected as an unknown field.
- **FR-9:** `DELETE /api/tasks/:id` and `GET /api/health` are unchanged.

### UI (ST-3, AC1, AC4)
- **FR-10:** The add form has an optional `type="date"` input with an accessible label. It is cleared after a successful add. An empty input sends no `due_date`.
- **FR-11:** `api.js` `addTask` sends `due_date` only when one is set.
- **FR-12:** Each task row shows its due date as raw ISO `YYYY-MM-DD`. Tasks with no due date show nothing, or an unobtrusive placeholder, and no error.
- **FR-13:** A task is overdue when `due_date` is set, `due_date < today` and `status !== 'done'`. Both sides are `YYYY-MM-DD` strings and today is the browser's local date. A task due today is not overdue.
- **FR-14:** Overdue tasks get a visual highlight and a visible "Overdue" text label, so the cue does not rely on color alone. The label is exposed to screen readers.
- **FR-15:** Server validation errors from `POST` show in the existing error area.

### Testing (ST-4)
- **FR-16:** Backend API tests cover:
  - `POST` with valid, omitted, `null`, `""`, invalid-format, impossible-date and non-string `due_date`;
  - `GET` returning `due_date`;
  - `PATCH` returning `due_date`;
  - a migration test that opens a database created with the old schema, checks that rows survive with `due_date = NULL`, and checks that a second start does not fail.
- **FR-17:** Frontend or E2E verification covers:
  - adding a task with and without a date;
  - display of the date;
  - overdue highlight and label for a past-due task that is not `done`;
  - no overdue marking for a `done` task, a task due today or a task with no date;
  - a regression check that view, add and delete still work.

## 4. Non-Functional Requirements

- **NFR-1 (Backward compatibility):** Existing view, add and delete behavior is unchanged. Clients that omit `due_date` keep working. Existing responses only gain the `due_date` field.
- **NFR-2 (Data safety):** No existing data is lost or modified. The migration is additive only. The SQLite file is never deleted or recreated.
- **NFR-3 (Security):** `due_date` is passed only through parameterized queries. Server-side validation is authoritative. The UI check is a convenience.
- **NFR-4 (Accessibility):** The date input is labelled. Overdue state is conveyed by text as well as color, with sufficient contrast.
- **NFR-5 (Timezone):** No timezone conversion. Dates are plain `YYYY-MM-DD` strings. The overdue check uses the browser's local date.
- **NFR-6 (Performance):** The migration check is a single `PRAGMA` at startup, with no measurable change to list latency.
- **NFR-7 (Platform):** Commands and scripts are Windows/PowerShell compatible.
- **NFR-8 (Traceability):** Each requirement maps to AC1-AC4 and ST-1 to ST-4 (see section 5).

## 5. Traceability

| Item | Requirements |
|---|---|
| AC1 (date input on add form) | FR-10, FR-11 |
| AC2 (existing tasks keep `due_date = NULL`) | FR-1, FR-2, FR-3, FR-16 |
| AC3 (API date validation) | FR-4, FR-5, FR-6, FR-7, FR-8 |
| AC4 (show date, highlight overdue) | FR-12, FR-13, FR-14, FR-15 |
| ST-1 Schema | FR-1 to FR-3 |
| ST-2 API | FR-4 to FR-9 |
| ST-3 UI | FR-10 to FR-15 |
| ST-4 Tests | FR-16, FR-17 |

## 6. Out of Scope

- Editing or clearing a due date after creation.
- Sorting or filtering by due date.
- Locale-formatted dates.
- Time-of-day or timezone-aware deadlines.
