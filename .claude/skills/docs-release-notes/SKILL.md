---
name: docs-release-notes
description: Writes grounded release notes and README updates after code review, with HITL approval and execution log reporting.
---

# Documentation & Release Notes Skill

- Include `Applied Skill: docs-release-notes` in your response and note step start/completion status for the structured orchestrator execution log.
- Resolve `<STORY-KEY>` and the confirmed feature/base branches from `docs/<STORY-KEY>/session-handoff.md` and live git commands. Stop and ask for confirmation if branch state is missing or conflicts.
- Review story-specific `docs/<STORY-KEY>/requirements.md`, `docs/<STORY-KEY>/architecture.md`, `docs/<STORY-KEY>/code-review.md`, and `git diff <BASE-BRANCH>...HEAD --stat`. Use legacy `docs/requirements.md`, `docs/architecture.md`, and `docs/code-review.md` only as explicitly documented fallback paths.
- Ground all release notes and README updates strictly in actual code changes, migration behavior, and verified test results; never invent unverified claims.
- Write release notes to `docs/<STORY-KEY>/release-notes.md` unless the repository's approved documentation convention is an existing legacy path. Present exact proposed files and content before writing or updating `README.md`.