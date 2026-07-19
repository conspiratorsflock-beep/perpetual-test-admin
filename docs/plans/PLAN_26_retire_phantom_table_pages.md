# Cleanup — Task: retire the pages built on never-applied tables
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started

Bryan's ruling (2026-07-19): **retire** the console surfaces that read the
four tables the reviewer proved absent from the live shared DEV DB
(`docs/MIGRATION_OWNERSHIP.md`, reviewer-verification section):
`integration_connections`, `sandbox_leads`, `build_queue_items`,
`lathe_audit_logs`. Those pages have been silently broken against the real
DB. A future "integration health dashboard v2" will be a NEW build reading
the REAL per-provider connection tables (`jira_connections`,
`slack_connections`, `azure_devops_connections`, …) — do NOT build it here;
this plan only removes the dead surface. This is a **change** (deletion)
task.

## Inventory (starting points — verify by reading imports, PLAN_23-style)
- `src/app/integrations/` — page(s) reading `integration_connections`
- `src/app/builds/` — page(s) reading `build_queue_items`
- Sandbox-leads UI — location unknown (no `src/app/leads/`; CLAUDE.md says
  the feature exists — find the page/tab reading `sandbox_leads`)
- `src/app/audit-logs/` — **CONDITIONAL:** retire ONLY if it reads
  `lathe_audit_logs` (absent). If it reads `audit_logs` (lathe-studio's
  real table, exists live), it stays — verify the actual table name in its
  action before touching anything.
- Their `src/lib/actions/*` modules, types, tests, and sidebar/nav entries
- `supabase/migrations/20260615_phase4_operational_tables.sql`,
  `20260620_lathe_audit_logs.sql`, `20260312_api_calls_tracking.sql` (dead
  per the ownership report) — DELETE the files; they were never
  tracker-applied and their features are retired
- `docs/MIGRATION_OWNERSHIP.md` — update classifications: mark #3/#11/#12
  as RETIRED (files deleted), so the cutover apply-list derivation stays
  correct
- CLAUDE.md / TODO.md feature lists — correct the claims (one-line evidence
  per flip, per PLAN_23 house style)
- EXCLUDE: anything reading tables that EXIST live (see the census in
  MIGRATION_OWNERSHIP.md); the dashboard page (verify which widgets read
  retired tables — remove only those widgets, not the page)

## What MUST be true / asserted
1. Zero references to the four table names remain in `src/` (grep-proven;
   list the grep in the report).
2. Every deletion is import-verified: nothing that stays imports anything
   that goes (the PLAN_23 SupportAnalytics lesson — resolve name collisions
   by reading imports, not names).
3. Nav/sidebar renders correctly with the entries gone (no dead links, no
   404 menu items).
4. `docs/MIGRATION_OWNERSHIP.md` reflects the retirement; the proposed
   cutover sequence no longer references deleted files.
5. Verify gate green: `npm run test` (deleted tests come out of the count —
   report baseline vs after), `npm run typecheck`, `npm run build` with the
   dummy-key recipe from PLAN_25/README.

## Branch workflow
1. Create `kimi/retire-phantom-pages` off latest main.
2. One commit per surface (integrations, builds, leads, conditional
   audit-logs, migrations+docs), + this plan doc. No `git add -A`.
3. Verify gate green after EVERY commit.
4. Report branch + summary. Do NOT merge.

## Guardrails
- The audit-logs conditional is the trap in this plan: `admin_audit_logs`
  (exists, KEEP — it's the console's own audit trail from PLAN_24) vs
  `lathe_audit_logs` (absent, retire) vs `audit_logs` (exists, lathe's —
  if the page reads THIS, the page STAYS). Three near-twin names; read the
  actual queries.
- Do not touch `admin_announcements` code — that's PLAN_27.
- Do not create the v2 integrations dashboard or any replacement stubs.
- Deleting a migration file is allowed HERE only because the report proved
  none of the three were ever tracker-applied; do not generalize this.
- Stuck = leave a marker + reason + report it.

## Report back to Claude
- Branch + per-file commits; grep proof for assertion 1; the audit-logs
  verdict with the table name it actually reads (file:line); test-count
  baseline vs after with the delta explained by deleted test files; gate
  numbers; verified vs NOT verified.
