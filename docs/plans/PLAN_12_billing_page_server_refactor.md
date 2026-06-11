# Medium — Task: Billing page → server component with explicit Stripe-configured flag
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** FIRST plan of this round. Base off local main at or after commit `06c4e6f` ("Untrack kimi-running-log..."). Verify: `git merge-base --is-ancestor 06c4e6f main` exits 0.

This is a **change** plan. `src/app/billing/page.tsx` is a `"use client"` component
that loads all data via server actions in `useEffect`, and it *infers* "Stripe is
not configured" from all-zero metrics (page.tsx:78–86) — a real org with zero
revenue would be told Stripe isn't set up. Convert it to an async **server
component** that fetches data and passes an **explicit** configured flag to a new
client presentation component.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/app/billing/page.tsx` (421 lines) — client component; states: loading
  spinner, error alert, null-metrics alert, then full dashboard (4 stat cards,
  Recharts MRR AreaChart, invoices/coupons tabs). The all-zeros heuristic at
  lines 78–86 is what this plan deletes.
- `src/lib/actions/billing.ts` — `getBillingMetrics()`, `getRecentInvoices()`,
  `getActiveCoupons()`, `getMRRHistory()` already exist and stay as-is
  (each returns mock/empty data when Stripe is unconfigured). **Do not change
  this file.**
- `src/lib/stripe/client.ts` — exports `isStripeConfigured` (truthy string OR
  false, NOT a boolean — coerce with `Boolean()` before passing as a prop).
  Server-side module: it must NEVER be imported by a `"use client"` file.
- `src/app/billing/error.tsx` — route error boundary already exists; a throw
  in the server component lands here. No change needed.
- `src/app/billing/__tests__/page.test.tsx` — tests the current client page
  (loading state, error state, rendered data). Will be rewritten (see below).

## Target shape
1. `src/app/billing/page.tsx` — async server component (no `"use client"`):
   `Promise.all` the four billing actions, compute
   `stripeConfigured = Boolean(isStripeConfigured)` from
   `@/lib/stripe/client`, render `<BillingDashboard metrics={...}
   invoices={...} coupons={...} mrrData={...} stripeConfigured={...} />`.
   No try/catch — let errors propagate to `error.tsx`.
2. `src/app/billing/BillingDashboard.tsx` — new `"use client"` component
   receiving everything as props. Move the ENTIRE current JSX (stat cards,
   chart, tabs, not-configured alert, mrrGrowth calc) verbatim; the
   loading/error/null-metrics states go away (server handles them). The
   "Stripe Not Configured" alert and the two "Stripe not configured." empty
   table cells key off the `stripeConfigured` prop now.
3. `src/app/billing/loading.tsx` — new: the same centered `Loader2` spinner
   the page currently shows while loading.

## What MUST be true / asserted
- The all-zeros inference is GONE; the only configured signal is the
  `stripeConfigured` prop derived server-side from `STRIPE_SECRET_KEY`.
- No secret or Stripe client object crosses to the client — props are plain
  serializable data + one boolean. `BillingDashboard.tsx` imports nothing
  from `@/lib/stripe/*` or `@/lib/supabase/*`.
- Rendered markup/classes otherwise unchanged (dark-only styling preserved;
  no new light-mode variants).
- Tests rewritten: (a) `BillingDashboard` rendered directly with props —
  configured=false shows the alert + "Stripe not configured." empty cells;
  configured=true with zero data shows "No invoices found."; populated data
  renders stat values and MRR growth badge sign correctly. (b) the server
  page: mock `@/lib/actions/billing` and `@/lib/stripe/client`, `await
  BillingPage()`, render the result, assert it forwards the flag (one test
  each for configured true/false).
- Gate after every commit: `npm run test` green (full-suite numbers, never
  per-file) + `npm run typecheck` clean. Baseline before this plan:
  **331 passed / 47 skipped (378)**. Test count may shift since page tests
  are rewritten — report old vs new count and the per-state mapping.

## Branch workflow
1. Confirm the sequence precondition above, then create
   `kimi/billing-server-page` off local main. Work on THIS machine's clone;
   do not fetch origin.
2. One commit per file + this plan doc. No `git add -A`.
3. Do NOT commit `docs/plans/kimi-running-log.md` — it is now gitignored;
   keep appending to it locally as usual.
4. Report branch + summary (format in KIMI_IMPLEMENTER_GUIDE). Do NOT merge.

## Guardrails
- `isStripeConfigured` is evaluated at module import from env. In tests,
  `vi.mock("@/lib/stripe/client", ...)` — do not try to set env vars after
  import.
- The existing `page.test.tsx` mocks the four billing actions; reuse those
  fixtures for the `BillingDashboard` prop fixtures rather than inventing
  new shapes.
- `metrics.trialToPaidConversionRate` badge thresholds (≥20 Good, ≥10 Fair)
  and invoice/coupon cell formatting are behavior — keep byte-identical JSX
  where possible so the diff reviews as a move, not a rewrite.
- Stuck = leave a marker + reason + report it. Never weaken assertions to
  get green.

## Report back to Claude
- Branch + per-file commits; work done vs deferred (count + reasons); real
  findings beyond the spec (file:line, consequence, action taken); full-suite
  gate numbers before/after + typecheck; **verified vs NOT verified** — your
  tests cannot prove the page renders in a real Next.js server pass; say so
  explicitly (the reviewer holds a runtime render gate on `/billing`).
