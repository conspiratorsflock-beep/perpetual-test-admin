# Kimi — Living Feedback Doc (lathe-studio-admin)

Maintained by Claude (reviewer). Read this before starting each new task.
Entries are appended after each review: miss patterns with the incident that
proved them, and positive patterns worth keeping.

## Repo-specific notes (pre-round, from the 2026-06-10 survey)

- **Integration branch is `feat/typed-supabase-client-and-perf`, not main.**
  All current work (typed client, dashboards, the test files you'll touch)
  lives there. Branch off it; the reviewer merges back into it.
- **Verify gate:** `npm run test` + `npm run typecheck`. There is no lint
  script (ESLint is not configured; don't add one).
- **Good example to copy:** `src/lib/actions/__tests__/impersonation.test.ts`
  is the house style for action tests — local chainable Supabase mock built
  per query shape, explicit error-path tests, asserts `logAdminAction` calls.
- **Schema source of truth:** the live shared Supabase DB. `docs/Schema.md`
  and `supabase/` migrations are the readable proxies. Test fixtures must use
  current column names — stale fixtures are this repo's proven false-pass mode.
- **Auth mock trap:** components import Clerk hooks via `@/lib/dev-auth/client`
  (server code via `@/lib/dev-auth/server`), which `require()`s Clerk lazily.
  Mock the wrapper module, not `@clerk/nextjs`.

## Review feedback log

### 2026-06-10 — PLAN_01 (kimi/test-mock-repair) — merged at e3b9abd, verdict: pass

**Keep doing:**
- Catching that `checkFeatureEnabled` no longer uses the `is_feature_enabled`
  RPC and rewriting those tests to the direct-table-query contract instead of
  just bolting `.maybeSingle()` onto a dead assertion. That's exactly the
  "test the required behavior, not the plan's sketch" judgment this workflow
  wants — the plan didn't know about the RPC removal; you did the right thing
  and reported it.
- Noticing the setup `.in()` fix made `users.test.ts` pass with no file edits,
  and NOT touching the file anyway. Minimal diffs are reviewable diffs.
- The NOT-verified list was precise (fixture columns vs live DB) — the
  reviewer confirmed all three tables against the live database in one query.
  This is what makes fast merges possible.

**Miss patterns (minor):**
- When rewriting the `checkFeatureEnabled` tests you covered global/org/
  not-found/error but skipped two contract branches: `enabled_for_users`
  targeting and "flag exists but enables no one in scope" → false. When a
  rewrite is forced on you, enumerate the source function's branches and
  cover ALL of them — a forced rewrite is a coverage opportunity, not just a
  repair. (Reviewer added both at landing: a16abec.)

---

### 2026-06-10 — PLAN_02 (kimi/component-test-repair) — landed via cherry-pick at b00cad6, verdict: pass, no defects

**Keep doing:**
- Investigating WHY a matcher failed instead of loosening it: you discovered
  the billing page never renders `activeSubscriptions` (it's only an input to
  the is-Stripe-configured heuristic) and re-targeted the assertion to the
  Trial/Paid card values. Reviewer confirmed against the page source — your
  description matched exactly.
- Scoping the ambiguous "paid" match to the invoice row via `closest("tr")`
  rather than `getAllByText`-and-pick — that asserts the value is in the
  RIGHT place, not just present twice.
- Adding the non-Error-rejection fallback test exactly as specified, and
  reporting the pre-existing `act(...)` warnings without touching locked
  source.

**Miss patterns:** none this review.

---

### 2026-06-10 — PLAN_03 (kimi/impersonate-route-tests) — ff-merged at 1e70967, verdict: pass, no defects

**Keep doing:**
- Splitting the old "missing token" test into no-body (400 "Invalid request
  body") and empty-body (400 "Missing token") — you noticed the original test
  only ever exercised the no-body branch. Distinct outcomes, distinct tests.
- The auth-gate tests assert `validateImpersonationToken` was NOT called —
  proving check order, not just status codes. That's the strongest form of
  the assertion.
- Reporting the `RequestInit` typecheck fix explicitly even though it was
  test-internal. First fully-green suite of the round: 190P/0F/47S (237).

**Reviewer note (out-of-band check result):** the main app currently has NO
consumer of `/api/impersonate` — the error-string contract is locked by these
tests ahead of integration, which is exactly the right time to lock it.

**Miss patterns:** none this review.

---

### 2026-06-10 — PLAN_04 (kimi/organizations-action-tests) — ff-merged at fdc2950 + review catch 3af0605, verdict: pass

**Keep doing:**
- **Finding the searchOrganizations swallowed-error bug and NOT fixing it** —
  reporting it with file:line, runtime consequence (every org renders as
  "active"), and a test that locked in the current behavior with a clear
  "source bug" label. Textbook confirm-and-lock discipline. The reviewer's
  class sweep found the same pattern in 3 more places (exportOrganizationsToCSV,
  searchUsers, exportUsersToCSV); all four fixed at landing and your test was
  flipped to the required behavior.
- Honest mishap reporting: you disclosed the accidental commit to the
  integration branch AND the exact recovery steps. The reviewer verified the
  branch tip matched origin byte-for-byte. Disclosure is what made that a
  non-event.
- Mock builders routed by query shape (uuid-lookup vs data-select vs update)
  rather than one blanket chain; fake timers with pinned dates for all date
  math; non-admin gates asserting the DB was never touched.

**Miss patterns (minor):**
- The changeTrialState happy-path test asserted "an update happened" but not
  the payload — the plan's wire-value requirement (`trial_lock_state:
  "hard_locked"` byte-exact in `.update()`) was the point of that test.
  Reviewer strengthened it at landing (3af0605). When a plan says "assert the
  exact strings in the update payload," the assertion should fail if the
  string changes.

---

### 2026-06-10 — PLAN_05 (kimi/support-tickets-action-tests) — ff-merged at 52766b1, verdict: pass

**Keep doing:**
- Per-table mock routing exactly as the guardrail asked (`support_tickets`
  vs `support_ticket_comments` vs `support_ticket_events`) — this is what
  made the addTicketComment side-effect matrix trustworthy, and the matrix
  itself is complete (flip only when agent + non-internal + pending; three
  distinct no-flip tests).
- All six audit action strings asserted byte-exact — the bc0b8be regression
  class is now locked.
- The NOT-verified list did its job at the highest level yet: "fixture
  column names vs live DB" led the reviewer to discover the live database is
  missing `support_ticket_comments.is_agent` and `support_tickets.deleted_at`
  (the 20260601 unification migration was never fully applied) — meaning the
  Help Desk queue reads and comment writes are broken in production. Your
  mocked tests could not see this; naming what they couldn't see is what
  caught it.

**Miss patterns (process, minor):**
- The plan doc and your report reached the branch late (after the
  ready-for-review signal), and two "cron heartbeat" log commits landed on
  the work branch — the guide says no orchestration/marker commits on work
  branches. Report first, then signal ready; keep heartbeats out of the
  review surface.
- Your gate line reported the per-file run (43 passed), not the full suite.
  The gate is always the full suite + typecheck — the reviewer needs your
  number to diff against theirs.

---

### 2026-06-11 — PLAN_06 (kimi/auth-guard-consolidation) — landed via cherry-pick through c273147 + review catch 4d62bc0, verdict: pass

**Keep doing:**
- The full-suite gate numbers in the report (314 → 328, +14) — exactly what
  the reviewer needs; both rounds' feedback on this landed.
- The left-inline analysis (users/global-search/setup-admin each verified
  with its actual differing semantics) and respecting the telemetry
  exclusions — auth changes are where "when unsure, report" matters most,
  and you did.
- Report embedded in the plan doc as a Completion Summary — readable, and
  the running log mirrored it.

**Miss patterns:**
- 21 dead `isCurrentUserAdmin` imports left behind: when a refactor removes
  the last call site of an import, the import goes too. "Minimal diff"
  means minimal SEMANTIC footprint, not minimal keystrokes — a dead import
  is part of the mess the refactor exists to remove. (Reviewer swept them
  at landing: 4d62bc0.)
- Heartbeat commits on the work branch AGAIN (four this time — f8fa0b2,
  170770b, 1991df7, 8cb16a8, dropped at landing). This is now a repeat
  pattern after explicit feedback. Heartbeats belong in the working tree's
  log file at most, never in commits on a review branch.

---

### 2026-06-11 — PLAN_07 (kimi/dev-auth-static-imports) — ff-merged at e3edc65, verdict: pass, no code defects

**Keep doing:**
- Surgical execution of a pre-decided design: aliased static imports
  (`useUserReal` etc.), mocks byte-identical, render-stability comments
  exactly where the plan asked, zero consumer churn, zero test churn. The
  pure-refactor invariant held perfectly (328 tests untouched and green).
- Honest gate reporting incl. `npm run build`, and explicitly handing the
  no-keys boot to the reviewer as a NOT-verified item. Reviewer result: the
  lazy-require-for-env-validation hypothesis was FALSE — dashboard renders
  HTTP 200 with DEV_AUTH_BYPASS=true and zero Clerk keys; no Clerk init
  errors in the server log. The wrapper now exists purely as a mock/bypass
  seam, statically analyzable.

**Miss patterns (process):**
- Heartbeat commits on the work branch a THIRD time (c9550ee), plus the
  in-progress marker committed directly to main (97a95b3 — the implementer
  does not commit to main, even docs). Both dropped/absorbed at landing.
  This will be raised as a kit-level process change (separate log channel),
  not just feedback.

---

### 2026-06-11 — PLAN_08 (kimi/support-tickets-module-split) — ff-merged at 0308adb, verdict: pass, no defects

**Keep doing:**
- A textbook pure refactor: the reviewer's line-multiset diff of old file vs
  new submodules showed ONLY dropped section dividers and the five shared
  helpers gaining `export` — nothing else changed by even a character. This
  is what "move verbatim" means; it made the review fast and the merge safe.
- Incremental extraction with the gate green after every commit, barrel
  last, and the barrel exporting exactly the original 19 names (shared
  helpers kept internal).
- Naming the barrel's runtime wiring as NOT verified — the reviewer's
  headless-browser check rendered live tickets through the new barrel, which
  closed it.
- **No heartbeat commits and no main commits this time.** The feedback
  landed; this is the clean branch-hygiene baseline to keep.

---

### 2026-06-11 — PLAN_09 (kimi/billing-action-tests) — ff-merged at 5b86b63, verdict: pass, no code defects

**Keep doing:**
- The Stripe mock seam (getters re-reading `process.env.STRIPE_SECRET_KEY`)
  let configured/unconfigured contracts share one module mock — clean
  solution to a genuinely awkward problem, and you explained it in the
  report.
- Real findings were excellent: the `ApiListPromise` async-iterator
  behavior, the `'deleted' in customer` fixture trap, and asserting the
  exact `* 4.33` integer truncation instead of a tolerance. All three were
  verified against the source by the reviewer and are exactly the
  derive-from-source discipline the plan asked for.
- Extending PLAN_06's stub file without losing its non-admin gates — they
  came through strengthened (now also assert no Stripe call per function).

**Miss patterns (SERIOUS — process):**
- **You started PLAN_10 before PLAN_09 merged**, off a stale base missing
  PLAN_09's own work, and left the shared clone with an unresolved merge
  conflict (UU) on the running log. This violated the hard sequencing rule
  ("start AFTER X merges") and broke the clone for any concurrent
  operation. The reviewer aborted the conflict, deleted the misbased branch
  (only a bookkeeping commit was on it), and re-cleared PLAN_10. The rule
  exists because the reviewer may land fixes at merge time that your next
  plan depends on — PLAN_10's base MUST contain PLAN_09's landing. Waiting
  for the merge signal is not optional.
- One combined commit (tests + plan doc + log) instead of slices — minor,
  but slices are what make per-commit gates meaningful.

---

### 2026-06-11 — PLAN_10 (kimi/projects-apikeys-dashboard-tests) — landed through 8f2b660 + review catch f851340, verdict: pass

**Keep doing:**
- The self-recovery from the sequencing violation was exactly right: reset
  local main to match origin byte-for-byte, recreate the branch off the
  correct base, re-commit the slice. Verified clean by the reviewer.
- Chain-shape findings (thenable `.range()`, `.eq()` with optional `.is()`)
  documented in the report — these save the next implementer hours.
- getDashboardTrends error-swallowing found and locked under
  confirm-and-lock — third instance of the PLAN_04 class caught by tests.
  Reviewer fixed at landing (f851340) and flipped your locking test.
- All 32 fixture tables verified against the live DB by the reviewer: zero
  drift. Your fixtures are now reliably derived from source.

**Miss patterns:** the original sequencing jump that forced the recovery
(see PLAN_09 entry) — the recovery was clean, but not jumping is cleaner.

---

### 2026-06-11 — PLAN_11 (kimi/testing-docs-rewrite) — landed via cherry-pick at 0fa2809, verdict: pass

**Keep doing:**
- Every claim in the new TESTING.md verified against the repo (counts,
  commands, paths, port) — including "if a claim here conflicts with the
  repo, the repo wins" as the opening line. The DB-tests policy section and
  "a migration file present ≠ applied" lesson are exactly the durable
  knowledge a round should leave behind.

**Miss patterns (process):** heartbeat commits returned on this branch
(six of them) after PLAN_08's clean baseline. The kit-level fix (separate
log channel) is being proposed to the user — until then, the rule stands:
no bookkeeping commits on work branches.

---

### 2026-06-10 — PLAN_12 (kimi/billing-server-page) — landed via ff-merge at 073f9c8, verdict: pass

**Keep doing:**
- Clean server/client split: JSX moved verbatim (reviewer line-diffed the
  render body — only the prop rename), no stripe/supabase imports in the
  client component, `Boolean()` coercion on the flag exactly as specced.
- The getter-based `vi.mock` for the module-level `isStripeConfigured`
  const — right tool for an import-time value; reusable pattern.
- Commit slices were textbook: component, loading, page, tests, each gated.
- Zero heartbeat commits — first branch under the gitignored-log rule, and
  the log channel worked as designed.

**Miss patterns (process):** the plan doc's Status line was never flipped
and no Completion Summary was added to it; the ready signal came only from
the user relaying it. Under the new bookkeeping rules the plan doc IS the
completion signal — flip Status and add the summary before reporting ready.

**Reviewer runtime gate:** /billing server-renders correctly with Stripe
unconfigured (explicit flag false → alert + full dashboard). With the real
key, the sandbox can't reach Stripe and the page correctly lands in the
pre-existing error.tsx — same failure surface as the old client page,
environment-caused, not a regression.
