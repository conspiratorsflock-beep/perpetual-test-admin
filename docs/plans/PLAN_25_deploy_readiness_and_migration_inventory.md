# Deploy readiness — Task: sweeps, deploy config, migration-ownership report
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER PLAN_24 merges

Second half of the staging-deployment push (context in PLAN_24 and
lathe-studio `docs/plans/ADMIN_APP_PRELAUNCH_PLAN.md`). Three concerns:
(1) correctness sweeps for two bug classes that repeatedly bit the main app,
(2) deployment configuration + runbook, (3) a **report-only** inventory of
this repo's `supabase/migrations/` — this console shares its database with
lathe-studio, whose prod-cutover plan currently applies ONLY lathe-studio's
migrations; the admin-console tables would silently not exist in prod. Parts
1–2 are **change**; part 3 is **confirm-and-lock** (a report, zero schema
changes).

## Inventory (verified 2026-07-19 — verify again, then work through)
- Clerk list calls: `src/lib/actions/global-search.ts:52` (`getUserList`),
  `src/lib/actions/organizations.ts:36,97,414` (`getOrganizationList`,
  `getOrganizationMembershipList`), `src/app/api/check-admin/route.ts:28`
  (`getUserList` by email) — plus any others a fresh grep finds
- `src/lib/actions/` (31 files, 42 `logAdminAction` references) — coverage
  verification target
- `supabase/migrations/` (10 files, `20260309…baseline_for_local` through
  `20260611…pin_search_path`) — report-only subject
- `src/lib/actions/announcements.ts` — `tier` column usage; "Live DB CHECK
  constrains tier to these four values" comment at :69
- No `vercel.json` exists at repo root today; `dev`/`start` scripts pin port
  3001 (dev convenience — Vercel ignores `start`)
- EXCLUDE: `src/test/setup.ts` (mocked Clerk clients); anything in
  lathe-studio's repo (reviewer owns cross-repo edits)

## What MUST be true / asserted
1. **Every Clerk list call passes an explicit `limit`** (500, or intentional
   small value with a comment) or paginates. The main app shipped three real
   bugs from the default-10 truncation (last-admin undercount, invite
   pre-check miss, MFA badge degradation) — same class here would corrupt
   admin decisions (e.g. org member views, global search).
2. **No raw Clerk id ever reaches a uuid column.** Grep the repo for queries
   against `org_id` / `user_id` / uuid-typed columns fed by Clerk ids
   (`org_…`/`user_…`). The main app's freshest instance of this class was
   fixed 2026-07-19 (`bfb64593`). Fix any hit; report each with file:line.
3. **Every mutating server action calls `logAdminAction`** (Critical Rule 1
   in CLAUDE.md). Produce the checked list: action → logs yes/no. Fix small
   gaps inline; report structural ones (e.g. a whole module without logging)
   rather than refactoring unprompted.
4. **Deploy config exists and builds:** minimal `vercel.json` (framework
   preset only — no cron, no regions copied from lathe-studio without reason);
   `npm run build` completes clean locally and is asserted in the report.
   README gains a "Deployment" section: env matrix for staging (shared DEV
   Supabase `zonsnvcwtfotqzrvozqs`) vs prod (new project ref at cutover),
   `NEXT_PUBLIC_ENV_LABEL` values, `ALLOW_ADMIN_BOOTSTRAP` semantics from
   PLAN_24, and a pointer to the deployment-protection expectation (Vercel
   password/allowlist while staging).
5. **`docs/MIGRATION_OWNERSHIP.md` exists** and classifies every file in
   `supabase/migrations/`: (a) local-dev-only baseline (the `20260309`
   lathe-studio snapshot), (b) admin-console-owned tables
   (`admin_announcements`? `support_tickets`, `integration_connections`,
   `sandbox_leads`, `build_queue_items`, system settings, help desk…),
   (c) shared-table changes that overlap lathe-studio ownership (the
   `20260601_unify_shared_schemas` case). For each: is it recorded in the
   shared DEV project's `supabase_migrations.schema_migrations` tracker, or
   was it applied out-of-band? End with a proposed exact apply sequence for
   prod cutover (which repo pushes what, in what order). Include the
   announcements `tier` CHECK constraint's actual live values and where
   `tier` is read/written in BOTH repos' code you can see from here (this
   repo's side; note the lathe-studio reader exists for the reviewer).
   **ZERO schema changes, zero tracker writes — report only.**
6. Verify gate green: `npm run test`, `npm run typecheck`, plus the build
   assertion in (4).

## Branch workflow
1. Create `kimi/deploy-readiness` off latest main (post-PLAN_24 merge).
2. One commit per concern (limits sweep, uuid sweep, logging coverage,
   deploy config, ownership report), + this plan doc. No `git add -A`.
3. Verify gate green after EVERY commit, not just the last.
4. Report branch + summary (format in KIMI_IMPLEMENTER_GUIDE). Do NOT merge.

## Guardrails
- The migration report will tempt you to "just fix" tracker drift or apply a
  missing migration. **Don't.** The shared-DB apply path is a
  reviewer/user-gated decision (lathe-studio has a prod-repair runbook and a
  `verify:migrations-applied` gate on its side; sequencing errors here break
  BOTH apps).
- `global-search.ts` may cap results deliberately for UI reasons — an
  explicit small `limit` with a comment satisfies assertion 1; don't blindly
  raise to 500.
- The `tier` work in this plan is inventory ONLY — the dead-tier cleanup is a
  cross-repo change the reviewer coordinates later.
- For the logging-coverage list, read each action's writes yourself — do not
  trust function names (`get*` actions that also upsert are exactly the miss
  class).
- Stuck = leave a marker + reason + report it. Never widen types or weaken
  assertions to get green.

## Report back to Claude
- Branch + per-file commits; work done vs deferred (count + reasons); real
  findings beyond the spec (file:line, consequence, action taken); gate
  numbers (suite count + exit, typecheck, build); **verified vs NOT
  verified** — expected entries: DEV tracker state (needs live DB access — if
  you can't query it, mark the tracker column "unverified" per row rather
  than guessing), and anything about lathe-studio's side of shared tables.
