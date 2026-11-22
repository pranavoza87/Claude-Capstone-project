# Project: Task Manager (Brownfield Capstone)

## Tech Stack & Paths
- **App Root:** `task-manager-app/`
- **Backend:** Express REST API (`task-manager-app/backend/src/server.js`) + SQLite (`task-manager-app/backend/src/db.js`, table `tasks(id, title, status)`). Port: `4000`.
- **Frontend:** React + Vite (`task-manager-app/frontend/src/`), proxies `/api` to `http://localhost:4000`. Port: `5173`.
- **Commands (run inside `task-manager-app/`):** `npm run install:all` | `npm run dev` | `npm run build` | `npm run start`.

## Non-Negotiable Agentic SDLC & HITL Rules
1. **Strict Human-in-the-Loop (HITL):** Never finalize an SDLC artifact, commit to git, modify production code, or create a PR without presenting a clear summary and receiving explicit human approval ("Approved" / "Proceed").
2. **Artifact Discipline:** Save all SDLC artifacts in `docs/` (`requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md`).
3. **Brownfield Safety:** Preserve all existing task viewing, adding, and deleting functionality. Never drop or wipe existing SQLite data during schema updates.
4. **Windows Environment:** All shell commands and hook scripts must be Windows/PowerShell compatible.