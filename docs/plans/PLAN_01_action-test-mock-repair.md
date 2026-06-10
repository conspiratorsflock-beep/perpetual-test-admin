# Test-suite repair round — Task 1: Repair stale auth/DB mocks in the four action-test files
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** first plan of the round

Four action-test files fail because their mocks went stale after two source
changes that were deliberate and correct: (a) `requireAdmin()` →
`isCurrentUserAdmin()` now fetches the user via `clerkClient().users.getUser()`
and reads `publicMetadata.isAdmin` (RBAC Phase 2), and (b) the announcements
schema was unified (`20260601_unify_shared_schemas.sql`) renaming
`title`/`content`/`type` → `message`/`style`/`tier`. This is a
**confirm-and-lock** task: the source under test must NOT change. A suspected
source bug is reported, not fixed.

Read `delegation-kit/KIMI_FEEDBACK.md` before starting.

**IMPORTANT — base branch:** branch off `feat/typed-supabase-client-and-perf`
(NOT main; all current work lives there). Include reviewer commits `28c9884`
and `bc0b8be` (verify they are in your base).

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/test/setup.ts` — shared mocks. `@clerk/nextjs/server` mock's
  `users.getUser: vi.fn()` resolves `undefined` → every `requireAdmin()` call
  explodes. Shared Supabase mock's `select()` chain lacks `.in()`.
- `src/lib/actions/__tests__/announcements.test.ts` (13 failing) — after the
  setup patch below, ~6 remain: fixtures and assertions use pre-unification
  columns (`title`, `content`, `type`, `target_tiers`, `target_orgs`,
  `is_active`, `created_by_email`). Current shape: see `mapRow` at
  `src/lib/actions/announcements.ts:13-22` and the select list at line 36
  (`message`, `style`, `tier`, `org_id`, `link_url`, `link_text`, `starts_at`,
  `ends_at`, `created_by`, `created_at`, `updated_at`).
- `src/lib/actions/__tests__/feature-flags.test.ts` (12 failing) — after the
  setup patch, 2 remain: the file's LOCAL Supabase mock lacks `.maybeSingle()`
  on the `select().eq()` chain used by `checkFeatureEnabled`
  (`src/lib/actions/feature-flags.ts:190`).
- `src/lib/actions/__tests__/audit-export.test.ts` (7 failing) — after the
  setup patch, 1 remains: the CSV test asserts `targetName` is ALWAYS quoted
  (`'"John Doe"'`); the implementation quotes only when needed. Derive the
  assertion from required behavior (valid CSV, RFC-4180-ish): read the actual
  escaping logic in `src/lib/actions/audit-export.ts` first. Plain values may
  legitimately be unquoted; values with commas/quotes/newlines must be
  quoted and escaped — keep the existing escaping-specific tests meaningful.
- `src/lib/actions/__tests__/users.test.ts` (5 failing) — `searchUsers` now
  also queries the lathe `users` table:
  `.from("users").select("clerk_user_id, is_billing_owner").in("clerk_user_id", clerkIds)`
  (`src/lib/actions/users.ts:63-65`, awaited directly → resolves
  `{ data, error }`). This file uses the SHARED Supabase mock, which has no
  `.in()`. Extend the shared mock (preferred, see sketch) or add a local mock.
- EXCLUDE: `TicketDetail.test.tsx`, `billing/page.test.tsx`,
  `impersonate route.test.ts` — they fail for different reasons and are
  Plans 02/03. Do not touch them. Do not touch `delegation-kit/`.

## What MUST be true / asserted
- The four target files: 0 failed.
- Source files under test unchanged: zero-line diff on `src/lib/actions/*.ts`,
  `src/lib/audit/*.ts`, `src/lib/clerk/*.ts`.
- Test fixtures use the CURRENT live column names (cross-check
  `docs/plans/Schema.md` / `supabase/` migrations, not old test data).
- Tests that assert `logAdminAction` calls keep asserting them (the audit
  invariant is load-bearing in this repo).
- The auth mock must not conflate "couldn't check" with "is admin": the
  default is an admin user; tests for unauthorized paths (if present) override
  explicitly.
- Suite after this plan: failures ONLY in the three excluded files
  (expect ~27 remaining failed; record the real number). Typecheck: 0 errors.
- Pure test/mocks change → total test count unchanged (229 incl. skipped).

## Branch workflow
1. `git checkout feat/typed-supabase-client-and-perf && git pull`, then create
   `kimi/test-mock-repair` off it.
2. One commit per file (setup.ts first), + this plan doc. No `git add -A`.
3. After every commit: `npm run test` (no NEW failures beyond the excluded
   files) and `npm run typecheck` (clean). There is no lint script.
4. Report branch + summary (format in KIMI_IMPLEMENTER_GUIDE). Do NOT merge.

## Pre-solved sketch (verified working by the reviewer — apply, then re-verify)
In `src/test/setup.ts`, `@clerk/nextjs/server` mock:

```ts
users: {
  getUser: vi.fn(() =>
    Promise.resolve({
      id: "user_test_123",
      publicMetadata: { isAdmin: true },
      emailAddresses: [{ emailAddress: "admin@test.local" }],
    })
  ),
  ...
```

This alone took the three files announcements/feature-flags/audit-export from
32 failures to 9. Starting point for the `.in()` extension (NOT verified —
get it right against the real chain in `users.ts:63-67`):

```ts
select: vi.fn(() => ({
  eq: ...,
  order: ...,
  range: ...,
  in: vi.fn(() => Promise.resolve({ data: [], error: null })),
})),
```

Note `searchUsers` maps over the resolved `data` — tests that need enriched
results must mock `.in()` per-test with meaningful rows.

## Guardrails
- The `@clerk/nextjs` (non-server) mock in setup.ts looks like a near-twin of
  the `/server` one — `isCurrentUserAdmin` imports from `/server`. Patch the
  right one (patching both is fine; verify which one each failure goes
  through).
- announcements fixtures: `tier` defaults to `"all"` when absent — the
  targeting test expects `"pro"`, so the fixture must carry `tier: "pro"`,
  not rely on defaults.
- If an assertion seems to pin behavior the current source doesn't have,
  the source is the spec (it's newer and deliberate) — EXCEPT where the test
  encodes a security property; then stop and report.
- Stuck = leave a `// CAST-DEBT:`-style marker + reason + report. Never widen
  types or weaken assertions to get green.

## Report back to Claude
- Branch + per-file commits; work done vs deferred (count + reasons); real
  findings beyond the spec (file:line, consequence, action taken); gate
  numbers (suite failed/passed/skipped + exit, typecheck); **verified vs NOT
  verified** — name explicitly what your tests structurally cannot prove
  (e.g. fixture column names vs the LIVE database — the reviewer re-verifies
  that out-of-band). Update `docs/plans/kimi-running-log.md`.
