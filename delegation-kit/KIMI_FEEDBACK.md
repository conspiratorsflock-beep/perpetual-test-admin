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

---

### 2026-06-10 — PLAN_13 (kimi/support-analytics-tests) — landed via ff-merge at 3e722db + review catch, verdict: pass

**Keep doing:**
- The sub-query error-swallowing find (analytics.ts:74,79) — correctly
  REPORTED as an in-file NOTE under confirm-and-lock instead of fixed or
  enshrined. Sixth instance of the class; reviewer fixed at landing and
  replaced the NOTE with two locking tests.
- Per-table chain factories matching real shapes (thenable team select vs
  .in().order() comments) — exactly the dashboard.test.ts pattern, applied
  cleanly.
- The volume-data fixture proving null created_at skips the WHOLE row
  (including its resolved date) — a subtle source behavior read correctly
  rather than assumed.
- Suite math exact: 331 + 18 = 349, full-suite numbers verifiable.

**Miss patterns (process):** second plan in a row with no ready signal —
Status line still "Not started", no Completion Summary, no log entry. The
reviewer proceeded after two quiescent ticks. Flip the Status line and add
the Completion Summary BEFORE going idle; it is the only signal channel
now that the log is local-only.

---

### 2026-06-10 — PLAN_14 (kimi/test-email-coverage) — landed via ff-merge at b2c152b, verdict: pass

**Keep doing:**
- `it.each` over all 9/4 exports for the non-admin gate — compact and
  exhaustive; adopt this for the remaining coverage plans.
- The captured-select assertion (received_at in, subject/body_text OUT) —
  exactly the behavioral complement to the source-scanning guardrail test
  the plan asked for.
- Both addTestEmailDomain branches (insert-new vs reactivate-on-readd)
  with the audit metadata (`reason: "re-added"`) matched to source.
- Suite math exact again: 351 + 46 = 397.

**Miss patterns (process):** third plan with no ready signal (Status line
still "Not started"). The reviewer now reviews on quiescence + complete
deliverable shape, but that is a fallback, not the contract — flip the
Status line.

---

### 2026-06-10 — PLAN_15 (kimi/builds-releases-coverage) — landed via ff-merge at 7676f47, verdict: pass

**Keep doing:**
- Testing against SOURCE reality over the plan text: the plan's guardrail
  claimed lathe-audit.ts reads `lathe_audit_logs`; the source reads
  `audit_logs`, and you tested `audit_logs`. The reviewer confirmed against
  the live DB: `audit_logs` exists (all 11 fixture columns exact),
  `lathe_audit_logs` does NOT — the plan (via TODO.md) was stale, the code
  and your tests are right. When the plan and the source disagree, the
  source wins; saying so in the report would make it perfect.
- Clean per-file slices, it.each gates everywhere, error paths +
  no-audit-log-on-failure for all three writes, soft-delete exclusion and
  null-heavy mapper fixtures as specced.
- Suite math exact: 397 + 48 = 445. All five fixture column sets verified
  live by the reviewer: zero drift.

**Miss patterns (process):** plan doc never committed with the branch this
time (and Status unflipped, fourth time). The branch should carry the plan
doc; the reviewer removed the local copy at landing as usual.

---

### 2026-06-10 — PLAN_16 (kimi/rbac-search-coverage) — landed via ff-merge at 925892a, verdict: pass

**Keep doing:**
- The ready signal returned: plan-doc status commit ("mark plan as
  executed") + log entries + correctly holding PLAN_17 for the go-signal.
  This is the contract working; keep it exactly like this.
- Real-guard fidelity on the two non-standard files: setup-admin's soft
  `{ success: false, message: "Unauthorized" }` (not a throw), the
  module-level SETUP_SECRET handled via env + module reset, the hardcoded
  emergency email locked by test; global-search's empty-buckets-when-not-
  admin and no-backend-calls-on-empty-query.
- MORE blocked-delete branches than the plan asked for (system-role guard,
  has-members guard) — found by reading source, exactly right.
- 85 tests, suite math exact: 445 + 85 = 530. All 12 audit strings
  diff-verified against source; all 7 RBAC tables confirmed live by the
  reviewer.

---

### 2026-06-10 — PLAN_17 (kimi/ops-actions-coverage) — landed via ff-merge at c0ffd71, verdict: pass

**Keep doing:**
- Full contract signal again (status commit + log report + NOT-verified
  table list) — two plans in a row. This is the steady state.
- Locking the deliberate fallbacks as-is (getApiCallsToday's catch→0,
  logError/recordApiCall's never-throw): the reviewer adjudicated these as
  intentional design (error IS examined, then downgraded), distinct from
  the never-examined-error bug class — your instinct to lock rather than
  "fix" was correct under confirm-and-lock.
- CSV RFC 4180 escaping, purge cutoff via fake timers, trend math with the
  zero-denominator branch — all per spec.
- Suite math exact: 530 + 37 = 567. All 7 NOT-verified tables (5
  per-provider connection tables + admin_error_logs + api_usage_logs)
  confirmed live by the reviewer.

---

### 2026-06-10 — PLAN_18 (kimi/database-test-harness) — landed via ff-merge at 9197bfe, verdict: pass (execution gate blocked on Docker)

**Keep doing:**
- Repo-over-plan again, and right again: the plan claimed
  `is_feature_enabled` exists in no migration; you greped migrations, found
  it in two (20260310, 20260601), and kept the RPC tests for the local
  stack. Plan text corrected by evidence twice this round — keep doing
  exactly this.
- The api-usage disposition is the model for honest skips: a documented
  skip block naming the missing table (`api_usage_logs` is lathe-studio-
  owned, absent from this repo's migrations) instead of deleting the file
  or faking a pass.
- The guard's operator-facing error message doubles as the runbook — the
  fail-fast run IS the documentation.
- Per-file disposition slices, status commit, log reports: full contract.

**Reviewer verification:** main gate 575P/0S (the 47 move out, +8 guard
tests in-main); fail-fast output confirmed; every table in the four
unskipped files traced to a creating migration; shared-project URL
rejection fixture present. NOT verified by anyone yet: actual execution
against a local stack — blocked on Docker, held by the reviewer.

---

### 2026-06-11 — PLAN_19 (kimi/security-hardening) — landed via ff-merge at a3659f3 + review catch, verdict: pass

**Keep doing:**
- FULL contract on the first plan of the round: Status flip, in-doc
  Completion Summary with gate numbers and verified/NOT-verified, grep
  proof for the email removal. Exactly the steady state.
- Scope-completing the email removal into the UI default value, the
  button label, and scripts/check-session.mjs (now requires an explicit
  arg) — the plan said "appears NOWHERE in the repo" and you took that
  literally and correctly.
- The number/boolean early-return in toCsv that makes the guard
  string-only by construction, not by regex luck.

**Reviewer catch (plan bug, not implementer miss):** the plan's own spec
excluded '-' from the string guard to protect negative numbers — but the
typed-number exemption already does that, so leading-'-' STRINGS were
left unguarded. Reviewer added '-' to the class + a locking test
(591st). When a spec tradeoff smells redundant, flagging it in the
report is welcome.

---

### 2026-06-11 — PLAN_20 (kimi/server-input-validation) — landed via cherry-pick + review catch, verdict: pass

**Keep doing:**
- 21 clean per-file slices over ~42 actions with the gate green at each;
  full contract (Status flip, Completion Summary with per-commit map,
  deferred section). The deferred SECTION is exactly right even when a
  deferral itself is wrong — it made the miss reviewable in seconds.
- Schema quality: announcement message capped at exactly the live
  CHECK's 500; enums sourced from types (reviewer diffed trial_lock_state,
  announcement style, service status against live CHECK constraints —
  all exact); zero modifications to existing tests (pure additions).

**Miss patterns:**
- Both deferral rationales were factually wrong: logError and
  recordApiCall ARE requireAdmin-gated (PLAN_17's own gate tests prove
  it) — the stale doc comments above them ("convert to an API route…")
  were trusted over the function bodies. Verify a skip-claim the same
  way you verify a plan claim: read the code, not the comment. Reviewer
  added validate-and-drop schemas for both + a tier enum (650 tests).
- Branch was cut from 40b5cd6 (the reviewer catch) instead of the
  go-signal commit 2e294ff — one commit early. Harmless this time
  (no overlap), and the reviewer landed via cherry-pick; the precondition
  is the "Remove executed PLAN_NN doc" commit, not the catch before it.

---

### 2026-06-11 — PLAN_21 (kimi/bound-queries) — landed via cherry-pick, verdict: pass

**Keep doing:**
- The site → cap → rationale → ordering table in the Completion Summary is
  the best report artifact of the round — review took minutes because every
  decision was pre-explained.
- Correctly recognizing the inventory's queue.ts:93,110 / test-cases:81 /
  test-runs:64 needed NO cap (they are .single() lookups; the plan's grep
  over-matched). Label was imprecise (".range() pagination" — they're
  .single()) but the engineering call was right.
- STATS_QUERY_LIMIT as a distinct high cap so aggregations don't silently
  undercount at page-size limits — good instinct the plan didn't ask for.
- Reviewer cleared your NOT-verified item: live max comments/events per
  ticket ≤ 1, all tables orders of magnitude under the caps.

**Miss patterns:**
- THIRD early-branch in a row: base was cea9889 — before the reviewer's
  catch (e53acca) and the go-signal (f6e4b33). That base is why your gate
  read 648 while main's baseline was 650; a baseline mismatch should have
  triggered a fetch-and-rebase, not a report. RESTATE THE RULE: before
  branching, `git log --oneline -1 main` must SHOW the "Remove executed
  PLAN_(N-1) doc" commit, and that commit is your base.
- Single combined commit where the plan specified one per action file —
  reviewable here (15 files, one concern), but slices are the contract.
