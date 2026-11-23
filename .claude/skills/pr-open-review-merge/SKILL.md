---
name: pr-open-review-merge
description: Prepares PR review and opening with the 5-section Copilot Capstone PR format, reviewer checklist, HITL gate, and execution log reporting.
---

# PR Open, Review & Merge Skill

- Include `Applied Skill: pr-open-review-merge` in your response and note step start/completion status for the structured orchestrator execution log.
- Resolve `<STORY-KEY>`, repository remote, current feature branch, and base branch from `docs/<STORY-KEY>/session-handoff.md` and live git commands. Stop if branch, handoff, or remote state is missing or contradictory.
- Verify the feature branch is clean and available on `origin`, then gather evidence from `docs/<STORY-KEY>/release-notes.md` and `docs/<STORY-KEY>/code-review.md`; use legacy `docs/release-notes.md` and `docs/code-review.md` only as explicitly documented fallback paths.
- Format every PR description using these exact 5 sections in order:
  1. `## Summary` — Concise behavioral summary grounded in verified implementation changes (what changed, matching rules/order, data/request boundaries).
  2. `## Changes Made` — Grouped factual bullet points with exact file paths for application/test/workflow/README updates, SDLC docs/agents/skills/hooks/rules artifacts, and any generated, database/sidecar, or dependency files present on the branch.
  3. `## Test Evidence` — Grounded strictly in verified test/verification reports and actual command outputs (exact commands, total/passed/failed/skipped counts, frontend build status, live health checks, and documentation checks). Never invent counts or pass states.
  4. `## Known Limitations` — Factual scope boundaries, skipped or unusable commands, security/audit findings, open review vs. verification reconciliation items, and branch bloat/unrelated files.
  5. `## Reviewer Checklist` — Unchecked `- [ ]` markdown checkboxes covering requirements/architecture alignment, automated test/build status, brownfield SQLite/API/scope safety, code review findings resolution, and changelog/release documentation.
- Pause at the HITL gate and present the dynamically resolved repository, base branch, head branch, title, and full 5-section body for explicit approval before creating or merging any PR via GitHub MCP or CLI.