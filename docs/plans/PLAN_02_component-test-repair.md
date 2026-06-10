# Test-suite repair round — Task 2: Repair TicketDetail and Billing page tests
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER Plan 01 merges

Two component/page test files fail: `TicketDetail.test.tsx` (19 tests, one
root cause) and `billing/page.test.tsx` (3 tests, stale matchers). This is a
**confirm-and-lock** task: the components/pages under test must NOT change.
A suspected source bug is reported, not fixed.

Read `delegation-kit/KIMI_FEEDBACK.md` before starting.

**IMPORTANT — base branch:** branch off `feat/typed-supabase-client-and-perf`
after Plan 01 has merged into it.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/components/help-desk/__tests__/TicketDetail.test.tsx` (19 failing, all
  one cause): the component imports `useUser` from `@/lib/dev-auth/client`
  (`TicketDetail.tsx:4`, used at line 83). The wrapper `require()`s
  `@clerk/nextjs` lazily, so the test's `vi.mock("@clerk/nextjs", ...)` (line
  8) never reaches it — the REAL Clerk `useUser` runs and throws
  "useUser can only be used within <ClerkProvider>".
  Fix: mock `@/lib/dev-auth/client` itself; remove the now-dead
  `@clerk/nextjs` mock if nothing else consumes it. Mirror the user shape in
  `src/lib/dev-auth/client.tsx:7-16` (`mockUser`) — check which fields
  TicketDetail actually reads (assign-to-self uses the user's id/name).
- `src/app/billing/__tests__/page.test.tsx` (3 failing, stale matchers):
  1. "should display billing metrics after loading" — can't find text `100`
     (activeSubscriptions). Inspect the rendered DOM (`screen.debug()`) and
     match what the page actually renders (formatting/splitting).
  2. "should display invoices in the invoices tab" — `getByText("paid")`
     matches multiple nodes (status badge + other text). Scope the query
     (e.g. `within(row)`, role-based query, or `getAllByText` with count).
  3. "should display error state when data fetch fails" — test rejects with
     `Error("Failed to fetch")`; the page displays `err.message`
     (`src/app/billing/page.tsx`: `setError(err instanceof Error ?
     err.message : "Failed to load billing data")`), so the rendered text is
     "Failed to fetch", not "failed to load billing data". Assert the actual
     contract: message of the thrown Error, plus the fallback string in a
     separate test with a non-Error rejection (counts as required-behavior
     coverage, add it).
- EXCLUDE: `impersonate route.test.ts` (Plan 03). Other component tests
  (TicketList, useSupportTickets, UserTable, UserSearch) pass — don't touch.
  Do not touch `delegation-kit/`.

## What MUST be true / asserted
- Both target files: 0 failed. No source/component changes (zero-line diff
  outside `__tests__/`).
- The dev-auth mock must represent a signed-in ADMIN (that's the component's
  operating context); don't invent fields the component doesn't read.
- Suite after this plan: failures ONLY in the impersonate route test file
  (~5; record the real number). Typecheck: 0 errors.
- Test count: 229 + exactly the tests you add (the non-Error rejection case);
  state the delta.

## Branch workflow
1. Branch `kimi/component-test-repair` off latest
   `feat/typed-supabase-client-and-perf` (must contain Plan 01's merge).
2. One commit per file, + this plan doc. No `git add -A`.
3. After every commit: `npm run test` (no new failures outside the excluded
   file) and `npm run typecheck`.
4. Report (format in KIMI_IMPLEMENTER_GUIDE). Do NOT merge.

## Guardrails
- Do NOT set `NEXT_PUBLIC_DEV_AUTH_BYPASS` in tests to dodge the wrapper —
  that flips the wrapper's other consumers and hides the real wiring. Mock
  the module.
- Wire values: ticket/invoice statuses (`"paid"`, `"in_progress"`, …) are
  wire strings — assert them exactly; never "fix" a test by changing a
  status string's case or wording.
- If TicketDetail still fails after the dev-auth mock, the cause is layered —
  diagnose before piling on more mocks; report what you find.
- Stuck = `// CAST-DEBT:` marker + reason + report. Never weaken an assertion
  to get green.

## Report back to Claude
- Branch + per-file commits; gate numbers; real findings beyond the spec;
  **verified vs NOT verified** (e.g. "matchers reflect rendered DOM in jsdom —
  NOT verified against the real browser/page"). Update
  `docs/plans/kimi-running-log.md`.
