# Refactor round — Task 11: Rewrite TESTING.md to current reality
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** ready_for_review · **Sequence:** start AFTER PLAN_10 merges (last plan; docs-only)

TESTING.md predates two overhaul rounds and now misleads: it documents a
lint step that no longer exists, casually suggests un-skipping the DB
integration tests (they hit the live shared DB!), and shows mock examples
that don't match `src/test/setup.ts`. Rewrite it. **Docs-only: zero code,
config, or test changes.**

Read `delegation-kit/KIMI_FEEDBACK.md` first. **Base branch: `main`.**

## What the new TESTING.md must contain (derive every claim from the repo, not from the old doc)
1. **Verify gate:** `npm run test` + `npm run typecheck`; no lint (removed
   in 28c9884 — Next 16 dropped `next lint`, ESLint not configured). State
   the current real suite size (run it; expect 350+ after Plans 06–10).
2. **Test architecture:** shared mocks in `src/test/setup.ts` (Clerk
   admin-by-default `getUser`, chainable Supabase mock incl. `.in()` /
   `.maybeSingle()`, dev-auth note); local per-file mocks override shared.
3. **House style:** point to `impersonation.test.ts` /
   `organizations.test.ts` as templates — per-table mock routing, non-admin
   gates asserting no DB call, byte-exact wire values, `logAdminAction`
   assertions on every write, fake timers for dates.
4. **The dev-auth trap:** components import Clerk via `@/lib/dev-auth/*` —
   mock the wrapper, never `@clerk/nextjs` (cite the TicketDetail incident).
5. **DB integration tests policy:** `src/test/database/*` stay
   `describe.skip` deliberately — they write to the LIVE shared DB; remove
   the old "just remove .skip" advice. Note the standing lesson: a committed
   migration file is not an applied migration — schema claims are verified
   against the live DB (reviewer does this via Supabase MCP).
6. **E2E:** current Playwright commands, unchanged if still accurate —
   verify the commands actually exist in package.json.
7. Keep it short. Delete anything you can't verify against the repo.

## What MUST be true
- Every command in the doc runs as written (run each one).
- Every file path referenced exists at the cited location.
- Zero non-doc diffs. Suite/typecheck untouched and green.

## Branch workflow
1. Branch `kimi/testing-docs-rewrite` off latest `main`.
2. One commit (TESTING.md), + this plan doc. Gate once before reporting.
3. Report. Do NOT merge.

## Report back to Claude
Branch + commit; claims you verified by running vs reading; anything in the
old doc you dropped because it was unverifiable. Update
`docs/plans/kimi-running-log.md`.
