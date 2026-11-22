---
name: code-review
description: Audits changes by severity, verifies diff and test grounding, and logs skill/step boundaries for code review.
---

# Code Review Skill

- Include `Applied Skill: code-review` in your response and note step start/completion status for the structured orchestrator execution log.
- Categorize findings by severity (Critical, Minor, Optional/Parked) grounded strictly in repository diffs, migrations, and actual test results.
- Pause at the HITL gate and present the review findings for explicit approval before writing `docs/code-review.md`.