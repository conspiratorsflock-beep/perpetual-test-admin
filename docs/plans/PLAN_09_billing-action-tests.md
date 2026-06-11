# Refactor round — Task 9: New unit tests for billing server actions
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** ready_for_review · **Sequence:** start AFTER PLAN_08 merges

`src/lib/actions/billing.ts` (332 lines) handles money — MRR/ARR metrics,
Stripe invoices/coupons — and has zero action-level tests (the billing PAGE
tests mock these actions entirely). Create
`src/lib/actions/__tests__/billing.test.ts`. **Confirm-and-lock**: source
must NOT change; suspected source bugs reported, not fixed. PLAN_06 added
`requireAdmin` to these functions — your tests lock that in.

Read `delegation-kit/KIMI_FEEDBACK.md` first. **Base branch: `main`.**

## Inventory (verified 2026-06-10 — verify line numbers, then work through)
Exports: `getBillingMetrics` (:33), `getRecentInvoices` (:138),
`getActiveCoupons` (:174), `getMRRHistory` (:210), `createCoupon` (:270),
`deleteCoupon` (:312). Before writing tests, READ the file and answer:
- How is Stripe accessed (SDK import? local client helper? fetch)? Mock at
  that seam, per-method.
- What is the Stripe-unconfigured behavior (no STRIPE_SECRET_KEY)? The page
  infers "not configured" from all-zero metrics — the action presumably
  returns zeros/empty rather than throwing. Lock that contract explicitly:
  it's load-bearing for the page's banner.
- `getBillingMetrics` also queries Supabase (trial counts) — route the mock
  per source.

## What MUST be true / asserted (minimum)
- **Auth:** every function rejects non-admins with "Unauthorized" and makes
  NO Stripe/Supabase call (PLAN_06's gate, locked here).
- **Audit invariant:** `createCoupon` and `deleteCoupon` assert
  `logAdminAction` with their exact action strings (read the source for the
  strings — they exist at :294 and :320); reads assert NOT called.
- **Stripe-unconfigured contract:** each read returns its documented
  empty/zero shape (not a throw) — one test per function.
- **Error paths:** Stripe call rejects → documented behavior (throw or
  fallback — derive from source, and if a read swallows errors into fake
  zeros indistinguishable from "configured but empty," report it as a
  distinct-signals violation, don't normalize it).
- Money values: assert exact integers (cents vs dollars — read how the
  source converts; a 100x error must fail the test).
- Gate: full suite green (current baseline + exactly your new tests — state
  both numbers), typecheck clean.

## Branch workflow
1. Branch `kimi/billing-action-tests` off latest `main`.
2. Commits: reads / writes / this plan doc. Full gate after every commit.
3. Report. Do NOT merge.

## Guardrails
- Do NOT add a Stripe dependency or real keys; everything is mocked at the
  module seam.
- The MRR history months are date-dependent — fake timers, pinned date.
- Fixture shapes for Stripe objects: derive from the source's property
  accesses, not from memory of Stripe's API — list any property you weren't
  sure about under NOT verified.
- Stuck = report. Never weaken an assertion.

## Report back to Claude
Branch + commits; functions covered; real findings (file:line + runtime
consequence); full gate numbers; verified vs NOT verified (Stripe response
shapes vs real API is the expected entry — the reviewer decides whether to
verify against Stripe docs). Update `docs/plans/kimi-running-log.md`.
