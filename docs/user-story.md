# EPIC: Task Scheduling & Deadlines
**Goal:** Enable users to track when tasks are due so they can prioritize work effectively.

## User Story: US-101 — Add Due Dates to Tasks
**As a** Task Manager user,  
**I want to** assign an optional due date to a task when creating it and see due dates displayed on my task list,  
**So that** I can track upcoming and overdue tasks at a glance.

### Acceptance Criteria
1. Users can optionally select a due date (`YYYY-MM-DD`) when adding a new task in the React UI.
2. Existing tasks without a due date continue to work with `due_date = NULL` (backward compatible).
3. The Express API (`POST /api/tasks`, `GET /api/tasks`) validates ISO date format (`YYYY-MM-DD`) and returns `400 Bad Request` for invalid dates.
4. The UI displays the due date next to each task and visually highlights overdue tasks (due date < today and status is not completed).

### Sub-Tasks
- [ ] **ST-1:** Update SQLite schema (`task-manager-app/backend/src/db.js`) to safely add nullable `due_date` column.
- [ ] **ST-2:** Update Express API endpoints & input validation (`task-manager-app/backend/src/server.js`).
- [ ] **ST-3:** Update React UI form, API client, and task list display (`task-manager-app/frontend/src/`).
- [ ] **ST-4:** Add automated backend API tests and frontend/E2E verification tests.