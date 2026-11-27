# Brownfield & SQLite Safety Rules

- Preserve existing database rows and schema structures; apply schema additions only via idempotent, non-destructive migrations.
- Ground all claims, API contracts, database behavior, and test counts strictly in repository files, diffs, and actual test outputs.
- Do not stage or commit auto-generated analytics or telemetry JSON artifacts.