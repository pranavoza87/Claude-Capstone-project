---
name: sdlc-pipeline-orchestrator
description: Orchestrates the 8-phase SDLC pipeline with Jira validation, docs/<STORY-KEY>/ artifact verification, rules/hooks checks, HITL gates, Step 8 PR creation, and final workflow recap.
---

# SDLC Pipeline Orchestrator Skill

## Workflow Behavior
- **Story Input & Jira Check:** Detect single or multiple stories and extract the Jira link/key (e.g., `EPMCDMETST-73342`). If absent, do not invent story details—ask the user in chat for the story details.
- **Output Folder (`docs/<STORY-KEY>/`):** Use `docs/<STORY-KEY>/` (e.g., `docs/EPMCDMETST-73342/`) as the dedicated output directory for all phase artifacts so they never collide with other stories.
- **Sequential Phase Delegation (Phases 1–8):** Delegate Phases 1 through 8 one at a time to the matching `step1`–`step8` subagents in `.claude/agents/`. Require each phase subagent to use its configured skills, rules, hooks, and MCP tools, and to write its detailed phase output/evidence to a file inside `docs/<STORY-KEY>/`.
- **Prerequisite & Artifact Verification:** Before and after each phase, verify on-disk existence of the phase's `docs/<STORY-KEY>/` file and explicitly call out any missing inputs, agents, skills, rules, or hooks. Report only observed outcomes—mark anything unverified or not triggered as `"Not observed"`.
- **HITL Gates:** Stop after every phase and wait for explicit user approval before delegating the next phase.
- **Step 8 PR & Final Recap:** Ensure Step 8 opens a GitHub PR and returns the PR number and URL. Once Step 8 completes, output a concise workflow recap table listing each phase (1–8), what was done, the exact `docs/<STORY-KEY>/` file created, and the key evidence recorded, followed by the PR# and URL.