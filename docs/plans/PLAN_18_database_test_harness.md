# Large — Task: Database-test harness — make the 47 skipped integration tests runnable, safely
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** LAST plan of the round; start AFTER PLAN_17 lands — main's log must show the reviewer's "Remove executed PLAN_17 doc" commit.

This is a **change** plan. `src/test/database/*` (5 files, 47 tests) has been
`describe.skip` since creation because the only configured database is the
SHARED dev DB (`zonsnvcwtfotqzrvozqs`) holding prod-ish lathe-studio data —
running write-tests there is forbidden. Worse, the main vitest setup
(`src/test/setup.ts:107`) globally mocks `@/lib/supabase/admin`, so these
tests could never hit a real DB under the current config even if unskipped.
This plan builds a separate, env-interlocked harness targeting a LOCAL
Supabase stack, and reconciles the stale tests with current code reality.

**PRECONDITION (reviewer/user gate, not Kimi's):** actually EXECUTING the DB
suite needs Docker + `supabase start`, which this machine does not currently
have. Kimi implements and verifies everything except live execution; the
REVIEWER holds the "suite actually passes against a local stack" gate until
Docker is available.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/test/database/` — `api-usage.test.ts` (172), `audit-logs.test.ts`
  (109), `feature-flags.test.ts` (158), `impersonation.test.ts` (163),
  `support-tickets.test.ts` (598). All `describe.skip`, all import the real
  `supabaseAdmin` / `supabaseAdminUntyped`.
- KNOWN-STALE content to reconcile (do not unskip as-is):
  - `feature-flags.test.ts` calls `rpc("is_feature_enabled", ...)` — that
    RPC exists in NO migration (the action code was reworked to direct
    table queries long ago). Rewrite those cases to assert table behavior
    that the current `feature-flags.ts` actions rely on.
  - `api-usage.test.ts` predates the api-usage reconciliation — verify
    every table/column it touches against `api_usage_logs` /
    `org_api_usage` (real schema), rewrite what's stale.
  - Inventory EVERY table, column, and RPC referenced across the 5 files
    and check each is created by `supabase/migrations/` (a local
    `supabase db reset` applies ONLY this repo's migrations — anything
    owned by lathe-studio, e.g. `organizations`, will NOT exist locally).
    Tests depending on lathe-studio-owned tables either get a minimal
    test-only seed (see below) or stay skipped WITH a one-line reason
    comment naming the missing table.
- `vitest.config.ts` — currently includes `src/**/*.test.{ts,tsx}`.
- `supabase/config.toml` + `supabase/migrations/` (12 files) exist; CLI
  v2.77.0 available via npx.

## Target shape
1. `vitest.config.db.ts` — NEW: `environment: "node"`, include ONLY
   `src/test/database/**/*.test.ts`, `setupFiles:
   ["./src/test/database/setup.ts"]`, same `@` alias. No jsdom, no global
   mocks.
2. `vitest.config.ts` — exclude `src/test/database/**`. Main-suite baseline
   becomes **(prior passing count) passed / 0 skipped** — the 47 move out
   of the main gate entirely. State both numbers in your report.
3. `src/test/database/guard.ts` — NEW: exported pure function
   `assertSafeDbTestEnv(env: Record<string, string | undefined>)` that
   throws with a clear message unless (a) `RUN_DB_TESTS === "1"`, and
   (b) the Supabase URL's host is `localhost` or `127.0.0.1`. Any remote
   host — INCLUDING the shared `zonsnvcwtfotqzrvozqs` project — must be
   rejected. This is the safety interlock; it is non-negotiable.
4. `src/test/database/setup.ts` — NEW: maps `SUPABASE_TEST_URL` /
   `SUPABASE_TEST_SERVICE_ROLE_KEY` onto the env vars
   `@/lib/supabase/admin` reads (BEFORE any test imports it), then calls
   `assertSafeDbTestEnv(process.env)`. Fail-fast with a message that tells
   the operator exactly how to run (`npx supabase start`, copy the local
   URL + service key, `npm run test:db`).
5. `src/test/database-guard.test.ts` — NEW unit tests for the guard, IN THE
   MAIN SUITE (it lives outside `src/test/database/`): rejects when
   RUN_DB_TESTS unset; rejects remote URLs (use a
   `https://zonsnvcwtfotqzrvozqs.supabase.co` literal as a fixture);
   accepts `http://127.0.0.1:54321`.
6. The 5 test files: `describe.skip` → `describe` (gating now comes from
   the config split + guard), stale content reconciled per inventory above.
7. `package.json`: `"test:db": "vitest run --config vitest.config.db.ts"`.
8. `TESTING.md`: new "Database integration tests" section — what they are,
   the local-only policy and why (shared dev DB holds prod-ish data), the
   runbook (`npx supabase start` → env → `npm run test:db` → `npx supabase
   stop`), and the note that the suite is NOT part of the main gate.

## What MUST be true / asserted
- `npm run test` (main gate) green with the new baseline and **zero**
  skipped database tests in its count; `npm run typecheck` clean.
- Guard unit tests prove the interlock: no env → throw; remote URL →
  throw; local URL + flag → pass.
- `npm run test:db` WITHOUT env/stack fails fast with the operator-facing
  message (run it once and paste the output in your report — this you CAN
  verify without Docker).
- No test file imports `src/test/setup.ts` mocks — the db config must not
  load them (verify by the fail-fast run actually attempting the guard,
  not a mock).
- Every remaining `describe`/`it` in the 5 files matches a table/RPC that
  exists in `supabase/migrations/`; anything else is skipped with a reason
  comment or rewritten. List the disposition per file in your report.

## Branch workflow
1. Confirm precondition, then `kimi/db-test-harness` off local main.
2. One commit per file + this plan doc. No `git add -A`.
3. Do NOT commit `docs/plans/kimi-running-log.md` (gitignored).
4. Main gate green after EVERY commit; full-suite numbers, never per-file.

## Guardrails
- NEVER point any config, env example, or doc at the shared project URL.
  The string `zonsnvcwtfotqzrvozqs` may appear ONLY in the guard's unit
  test as a rejection fixture and in TESTING.md's "why local-only" prose.
- Do not "fix" stale tests by deleting assertions wholesale — rewrite them
  to assert the CURRENT contract (what the action code actually relies
  on), or skip-with-reason. Deleting a whole test case needs a one-line
  justification in the report.
- `supabaseAdmin` reads its env at module import — the setup file's env
  mapping must run before the first import of `@/lib/supabase/admin`
  (setupFiles run first; keep the import inside test files, not setup).
- You cannot run the db suite (no Docker here). Do NOT claim it passes.
  Your report's NOT-verified list must lead with that.
- Stuck = marker + reason + report. Never weaken the interlock to make
  something runnable.

## Report back to Claude
- Branch + per-file commits; per-file disposition table (kept / rewritten /
  skipped-with-reason, with counts); the pasted fail-fast output of
  `npm run test:db`; main-suite before/after numbers + typecheck;
  **verified vs NOT verified** — leading with "db suite never executed
  against a real database" plus any schema claims you could not check.
