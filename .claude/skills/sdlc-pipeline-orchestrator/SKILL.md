---
name: sdlc-pipeline-orchestrator
description: Coordinates SDLC subagents with HITL approval gates and writes a structured execution log of subagent start/end and skills used.
---

# SDLC Pipeline Orchestrator Skill

- Include `Applied Skill: sdlc-pipeline-orchestrator` in your response and pause at HITL gates before mutating files, pushing git branches, or invoking write MCP tools.
- For every delegated step, record step number, subagent name (`agent_type`), preloaded skill name, start timestamp, end timestamp, status, and output artifact path into `docs/sdlc-execution-log.json` (and a readable summary in `docs/sdlc-execution-log.md`).
- Ground all log entries and summaries strictly in observed subagent outputs, hook start/end records, and verified repository state.