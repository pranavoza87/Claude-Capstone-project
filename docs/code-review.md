# Code Review: US-101 Optional Due Date

**Status:** Approved by human reviewer. Optional fixes NOT applied.
**Inputs:** `docs/requirements.md`, `docs/architecture.md`, `docs/design-review.md`, `docs/impl-plan.md`, and the `main..HEAD` diff
**Verdict:** Approve. No Critical issues.

## Review basis

- Git is available. Branch `feature/us-101-due-dates`; `main..HEAD` is 1 commit (`eb21fa2`) on baseline `f9fb350`. Diff: 20 files, +850/-14.
- Working tree: the only untracked file is `.claude/agents/step6-code-review.md`.
- The reviewer did not modify any code. It did not run `npm run build` or the manual smoke test.
- **Open point for the human:** the implementation is already committed. The implementation agents report that they did not commit and found no git repo, so the origin of commit `eb21fa2` is unconfirmed. Under `CLAUDE.md` rule 1, commits need explicit human approval. Confirm this before any PR.

## Test results (run by the reviewer)

| Suite | Result |
|---|---|
| Backend `node --test` | 122 pass, 0 fail |
| Frontend `npm run test:frontend` | 10 pass, 0 fail |
| `npm run test:bdd` (bddgen + Playwright, temp DB) | 11 of 11 pass |

The tracked `backend/tasks.db` was untouched by the E2E run, and `git status` stayed clean afterward.

## Critical

None.

## Minor

1. **Process: work already committed.** `CLAUDE.md` rule 1 requires explicit human approval before any commit. Whether approval was given cannot be determined from the repo. If not, flag before the PR; if so, no action.
2. **Scope creep in the commit.** `.claude/agents/step5-implementation.md` (+18 lines) is in the feature commit. It is tooling unrelated to US-101. Move it to a separate commit or drop it from the PR.
3. **`requirements.md` and `impl-plan.md` out of sync with code.**
   - `requirements.md` section 3, decision 3 says "PATCH unchanged". The PATCH response now includes `due_date` (`server.js` ~line 111, `RETURNING id, title, status, due_date`). This is approved deviation M3 and is additive.
   - The `deepEqual` edits in `tasks.patch.test.js` (lines 64, 185, 203) only add `due_date: null`; no assertion was weakened.
   - Recommended: amend `requirements.md` section 3, decision 3. Also correct the stale "no git repo" and "rollback from backup" text in `docs/impl-plan.md`.
4. **Small test gaps (none block approval).**
   - No unit test covers `api.js` `addTask` omitting `due_date` when empty (only indirectly via BDD scenario 2).
   - No test covers the date input being kept after a failed add (`handleAdd` clears only on success, which is correct but untested).

## Nitpicks

1. **Duplicate `.add-form` selector** (`styles.css` ~lines 19-23). Merge the new `flex-wrap`/`align-items` rule into the original block. The `input[type='date'] { flex: 0 0 auto }` rule is needed so the date input is not stretched by `.add-form input { flex: 1 }`. Both are justified, small, and scoped to the form; they cannot affect list rows.
2. **Inconsistent CSS formatting** (`styles.css` ~lines 98-100). The three appended rules are one-liners using `.75rem`; the rest of the file uses multi-line rules and `0.75rem`.
3. **`PRAGMA table_info(${table})`** (`migrations.js` line 5) uses string interpolation. Safe because the only caller passes the constant `'tasks'`, but fragile if reused. Add a comment or an allowlist.
4. **Overdue recomputed only on render.** A tab left open past midnight updates on the next render, not by timer. Documented in `App.jsx` and acceptable under the requirements.
5. **Six-digit years in the browser date input.** Browsers can emit values such as `20255-01-01`. The server returns 400 and the UI shows the error. Decision 8 deliberately rules out min/max; informational only.
6. **Honolulu boundary example (known extra).** The plan specified Auckland only. Auckland (UTC+13) catches a UTC-based bug after local midnight; Honolulu (UTC-10) catches the opposite case (overdue too early). Both pass. Keep it as an approved addition.
7. **Generated `.features-gen/` and `test-results/` are gitignored.** `backend/tasks.db`, `-shm`, `-wal` are tracked in git, but that predates this change and `main..HEAD` does not touch them.

## Checklist findings

| Area | Result |
|---|---|
| Correctness and edge cases | Strict regex `^\d{4}-\d{2}-\d{2}$`, no `new Date()` (NFR-5). `$` in JS does not match before a trailing `\n` (tested with `"2025-01-01\n"`). Leap-year rule correct: 1900 rejected, 2000 and 2024 accepted. `0` and `false` rejected, not treated as empty. `undefined`, `null`, `""` store NULL. `isOverdue` is `!!due && status !== 'done' && due < today`. `todayLocal` uses local getters. Legacy status `blocked` with a past date is overdue (tested). |
| Brownfield safety | `migrate()` only runs `ALTER TABLE ADD COLUMN`, PRAGMA-guarded, tolerant of a concurrent duplicate-column error. Original `CREATE TABLE IF NOT EXISTS` untouched. `module.exports = db` unchanged. Tests cover a legacy 4-row table (incl. `blocked`) migrated twice with rows kept and `due_date` NULL, plus a test through `db.js` against a seeded legacy file. View, add, delete, search and inline edit unchanged. POST without a date behaves as before. |
| Security | All SQL parameterized (`INSERT ... VALUES (?, ?, ?)`); PATCH column list from the validated allowlist. Validation precedes insert; title error takes precedence. PATCH still rejects `due_date` as an unknown field (tested). Error shapes preserved: legacy on POST, envelope on PATCH. |
| Accessibility | Date input has a visible `<label htmlFor>`. Due date rendered as `<time dateTime>`. Overdue shown by text label, border and background, not colour alone (NFR-2). Contrast adequate (`#b00020` on `#fdecea`, `#555` on white). The title input still lacks a label, but that predates this change. |
| Test quality | Validator, POST, GET, brownfield and migration tests are thorough. E2E fixtures use the API, a mocked clock and relative dates, on a throwaway DB with `reuseExistingServer: false`. Cleanup by unique per-scenario title. The midnight-boundary outline would fail on a UTC bug. No assertions weakened. |
| Cleanliness | No `console.log` or debug leftovers. No stray temp files tracked. |

## AC and requirement traceability

| AC | Requirement | Implementation | Test evidence | Status |
|---|---|---|---|---|
| AC1 optional date in the UI | FR-1 | `App.jsx` date input and label; `api.js` conditional `due_date` | BDD scenarios 1, 2 | Met |
| AC2 existing tasks have `due_date = NULL` | FR-2, FR-4, FR-7 | `migrations.js`, `db.js`, `server.js` GET | `migrations.test.js` (4 tests), legacy-row GET test, BDD scenario 7, add/delete/search regression | Met |
| AC3 API validates YYYY-MM-DD, returns 400 | FR-3, FR-4 | `validation.js`, `server.js` POST | `tasks.due-date.test.js` (validator and POST, exact error body, no insert); BDD scenario 9 | Met |
| AC4 UI shows date and highlights overdue | FR-5, FR-6 | `App.jsx`, `dates.js`, `styles.css` | `dates.test.js` (10), BDD scenarios 3-6 and the 2-row timezone outline | Met |
| Automated tests | Section 6 | Backend, frontend, BDD suites | 122 + 10 + 11, all passing | Met |
| NFR-1 to NFR-5 | n/a | See checklist | n/a | Met |

## Recommended fixes (all optional; none block the PR; NOT applied)

1. Confirm approval for the commit, or note it in the PR description.
2. Remove `.claude/agents/step5-implementation.md` from the feature commit, or split it out.
3. Amend `docs/requirements.md` section 3, decision 3 to record the PATCH response change (M3); correct the stale git statement in `docs/impl-plan.md`.
4. Merge the two `.add-form` CSS blocks and reformat the three appended rules.
5. Optionally add a small `api.js` payload test (empty date omitted).
