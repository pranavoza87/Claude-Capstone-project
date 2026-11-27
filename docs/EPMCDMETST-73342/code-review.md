# Code Review: EPMCDMETST-73342 (Overdue quick filter)

Status: APPROVED with recommendations (Phase 6 gate, human approval "Approved, use your recommendations", 2026-11-23). Not committed.
Reviewed: uncommitted working-tree changes on branch feature/EPMCDMETST-73342-overdue-filter (HEAD b0e61a5).
- Modified: task-manager-app/frontend/src/{App.jsx,dates.js,styles.css}, task-manager-app/frontend/test/dates.test.js
- New (untracked): task-manager-app/tests/bdd/features/overdue-filter.feature, task-manager-app/tests/bdd/steps/overdue-filter.steps.js
Against: requirements.md, architecture.md, design-review.md, impl-plan.md (all approved).
Authoring note: step6-code-review returned this review without writing files (HITL); the orchestrator wrote it after approval. The reviewer's re-run counts below are from real output. Manual visual verification was completed on 2026-11-23.

## 1. Verdict
Approve with minor follow-ups. No Blocker, High or Medium findings. No required changes.

## 2. Test and build results (reviewer re-run, from printed output)
- `npm run test:frontend`: 20 tests, 20 pass, 0 fail (baseline 10).
- `npm run test:backend`: 122 tests, 122 pass, 0 fail (baseline 122).
- `npm run test:bdd`: 18 passed in 11.8s (11 existing due-date scenarios + 7 new overdue-filter scenarios; baseline 11).
- `npm run build`: succeeded (33 modules transformed, built in 515ms).
- `git status --porcelain -- task-manager-app/backend`: empty. No schema, API, migration or backend change.
- Implementer's Phase 4 run produced the same counts.

## 3. Requirement coverage
| Req | Evidence | Result |
|---|---|---|
| AC1 / FR-1 | App.jsx 252-260: native checkbox with `<label htmlFor>`, default false, in the search area | Pass |
| AC2 / FR-2 / FR-3 | `filterTasks` calls `isOverdue(task.due_date, task.status, today)`, the same function the row label uses; drift-guard unit test covers 7 due values x 5 statuses | Pass |
| FR-4 | Search AND (off OR overdue); unit test "combine (AND)" and BDD "combines with the title search" | Pass |
| FR-5 / FR-10 | Client-side only; state is `useState(false)`, not persisted | Pass |
| FR-6 | App.jsx 271-275, gated on `hasLoadedTasks && overdueOnly && tasks.length > 0 && visibleTasks.length === 0`; mutually exclusive with "No tasks yet."; BDD asserts the latter is absent | Pass |
| FR-7 / AC3 | `load()` only replaces `tasks`; add and delete with the filter on are covered in BDD; existing 11 BDD scenarios and 122 backend tests pass | Pass |
| FR-8 / AC4 | 10 new unit tests and 7 new BDD scenarios | Pass |
| FR-9 | No count added (decision) | Pass |

Design-review items implemented: R1 (scoped CSS), L1 (filterTasks contract), L2 (header comment), L3 (role="status"), separate feature file with module-private helpers.

## 4. Findings

### Blocker / High / Medium
None.

### Low
- L1 resolved: Manual visual verification passed at desktop and 375px mobile widths. The checkbox is compact and inline with "Show overdue only"; checked and unchecked states are distinct; overdue rows retain the red accent and "Overdue" text; filtered-out future tasks are not shown. Evidence: `docs/EPMCDMETST-73342/images/tm-checkbox-default.png`, `tm-checkbox-selected.png`, and `tm-checkbox-mobile.png`.
- L2: `role="status"` is on an element mounted only when the empty state appears; some screen readers announce live regions reliably only when the container exists before its content changes. The BDD test checks role and text, not announcement. Acceptable as approved (design-review L3). Optional follow-up: an always-rendered `<p role="status">` whose text changes.
- L3: The empty state is tested only together with a search term ("future"). A plain "filter on, tasks exist, none overdue" case without a search is not covered in BDD. The existing scenario still exercises the `tasks.length > 0 && visibleTasks.length === 0` branch and asserts all four required facts.

### Nit
- N1: "unknown status string" duplicates the `weird` case in the drift-guard matrix; "today boundary" duplicates cases in "overdueOnly keeps only a past-due". Harmless.
- N2: The drift-guard test compares `filterTasks` to `isOverdue`, so it is partly self-referential; it still catches re-implementation of the predicate (FR-3). The explicit-expectation tests cover the semantics.
- N3: `row()` uses `hasText` substring matching. Safe today (titles are `uid + ' ' + label`, uid has a random suffix, labels within a scenario are not substrings of each other; delete uses an exact accessible name). Do not add a label like "pasta" next to "past" in one scenario.
- N4: The filename `dates.js` now undersells the file; placement was an approved decision (design-review Q4).
- N5: No scenario checks the accepted behavior that a non-overdue task added while the filter is on disappears silently (design-review L4); accepted.

## 5. Checklist notes
- Brownfield: view, add, delete and edit paths untouched. The `visibleTasks` guard moved into `filterTasks` verbatim; a unit test confirms id 0 is kept; the query is still lowercased with no trim.
- Security: frontend only; no new input path, no `dangerouslySetInnerHTML`, no queries. SQL injection not applicable.
- Test isolation: BDD uses the Playwright temp DB; the tracked database files are untouched; fixtures clean up after each scenario.
- Cleanliness: no console.log, TODO or debug code in the diff; `dist/` is gitignored.

## 6. Resolved decisions (recommendations accepted)
1. Manual visual check (L1): completed on 2026-11-23 at desktop and 375px mobile widths using a temporary `DB_PATH`. Desktop selected and mobile screenshots confirm layout and filtering. Three evidence screenshots are stored in `docs/EPMCDMETST-73342/images/`.
2. L2 (always-mounted live region) and L3 (empty-state scenario without a search): parked as optional follow-ups; no code change in this story.

## 7. Before commit / PR (hygiene, not code defects)
- Do not stage `docs/codemie/analytics/*.json` or `.claude/hooks/subagent-audit.log`.
- Commit `docs/EPMCDMETST-73342/` deliberately as the SDLC artifacts directory.
- Any commit, push or PR needs separate explicit approval.
