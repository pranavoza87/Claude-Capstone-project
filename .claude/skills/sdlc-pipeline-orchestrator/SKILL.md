---
name: sdlc-pipeline-orchestrator
description: Orchestrates SDLC pipeline phases with Jira link validation, chat fallback, multi-story support, /docs run-folder file checks, prerequisite call-outs, and HITL stops.
---

# SDLC Pipeline Orchestrator Skill

## Workflow Behavior
- **Story Input & Jira Check:** Detect single or multiple stories and check whether a Jira story link or issue key is provided.
  - If a Jira link/key is present, use it as the primary story reference.
  - If a Jira link/key is absent, do not guess or invent story details—prompt the user in chat to provide the user story details.
- **Phase Delegation & Run Folder:** Route one phase at a time to the matching subagent/skill and use a dedicated run folder under `docs/` (such as `docs/runs/<story-or-batch-slug>/`), verifying expected phase output files on disk.
- **Explicit Prerequisite Call-Outs:** Before or after executing a phase, explicitly call out any missing inputs, missing step agent files (`step5`–`step8`), rules, skills, hooks, or expected `/docs` artifacts on the current branch.
- **HITL Gates & Grounded Reporting:** Stop at each Human-in-the-Loop (HITL) approval gate for user confirmation, and report only observed subagents, skills, rules, hooks, files, and command results (marking anything unverified or not triggered as `"Not observed"`).