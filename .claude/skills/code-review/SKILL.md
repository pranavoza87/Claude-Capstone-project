---
name: code-review
description: Audits changes by severity, verifies diff and test grounding, and logs skill/step boundaries for code review.
---

# Code Review Skill

- Include `Applied Skill: code-review` in your response and note step start/completion status for the structured orchestrator execution log.
- Resolve the story key from the orchestrator input or `docs/<STORY-KEY>/session-handoff.md`.
- Resolve the feature branch with `git branch --show-current` and reconcile it with the handoff before reviewing. Resolve the base branch from `git symbolic-ref refs/remotes/origin/HEAD` or the handoff; stop if the handoff is missing or contradictory.
- Review `git diff <BASE-BRANCH>...HEAD` for the confirmed feature branch and repository state. Never compare against an assumed branch or a different story branch.
- Read story-specific `docs/<STORY-KEY>/requirements.md`, `docs/<STORY-KEY>/architecture.md`, and `docs/<STORY-KEY>/design-review.md`. Use the legacy `docs/` paths only as explicitly documented fallback paths.
- Categorize findings by severity (Critical, Minor, Optional/Parked) grounded strictly in repository diffs, migrations, and actual test results.
- Pause at the HITL gate and present the review findings for explicit approval before writing `docs/<STORY-KEY>/code-review.md`.