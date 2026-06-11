# Medium — Task: Tests for test-email.ts + test-email-domains.ts (13 functions)
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER PLAN_13 lands — main's log must show the reviewer's "Remove executed PLAN_13 doc" commit.

**Confirm-and-lock**: tests only; source must not change. These files guard the
Test Email dashboard, which has a hard privacy invariant: **message content
columns are never selected**. A guardrail test for that already exists
(`src/lib/actions/__tests__/test-email-content-guardrail.test.ts`) — do NOT
duplicate it; this plan adds the behavioral coverage around it. If a test
reveals a real bug, report it; don't fix or enshrine it.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/lib/actions/test-email.ts` (422 lines, 9 exports, all
  `requireAdmin()`-gated; 2 write paths call `logAdminAction`):
  `isTestEmailProvisioned`, `getTestEmailOverview`,
  `getTestEmailAbuseSignals`, `searchTestEmailMailboxes`,
  `getMailboxMessageVolume`, `getTestEmailInboundHealth`,
  `getTestEmailHealth`, `forceExpireMailbox` (write), `deleteMailbox` (write).
- `src/lib/actions/test-email-domains.ts` (221 lines, 4 exports, all gated,
  ALL FOUR audit-logged): `listTestEmailDomains`, `addTestEmailDomain`
  (reactivate-on-readd path!), `deactivateTestEmailDomain` (soft),
  `reactivateTestEmailDomain`.
- New files: `src/lib/actions/__tests__/test-email.test.ts` and
  `src/lib/actions/__tests__/test-email-domains.test.ts`.
- Pattern: per-table `from` mockImplementation as in dashboard.test.ts;
  `vi.mock("@/lib/audit/logger")` to assert audit calls.

## What MUST be true / asserted
- Non-admin gate ×13: `requireAdmin` rejects → action rejects AND no
  `supabaseAdmin.from` call.
- READ the source first and test ACTUAL behavior — particularly:
  - `isTestEmailProvisioned` is a failure-safe probe — assert what it
    actually returns on query error (it must not throw).
  - `getTestEmailOverview` / `getTestEmailAbuseSignals` aggregate in JS from
    bounded queries — verify tallies (active counts, 24h/7d windows via
    `vi.setSystemTime`, near-cap/at-cap users) against small fixtures.
  - `getMailboxMessageVolume` selects ONLY `id, mailbox_id, received_at,
    read` — assert the select string contains no content column (subject,
    from_address, from_name, body_text, body_html). This complements, not
    duplicates, the guardrail test (that one scans source; yours asserts
    the mock saw the right select).
- Writes: `forceExpireMailbox` and `deleteMailbox` call `logAdminAction`
  with their real action strings (read them from source — do not guess);
  on DB error they throw AND `logAdminAction` is NOT called.
- Domains: `addTestEmailDomain` on an existing inactive domain REACTIVATES
  instead of inserting (both branches tested); deactivate is an update, not
  a delete; all four log with correct action strings; error paths throw.
- Pure test-addition: full suite = previous baseline + new tests; typecheck
  clean; gate green after every commit; full-suite numbers in the report.

## Branch workflow
1. Confirm precondition, then `kimi/test-email-coverage` off local main.
2. One commit per test file + this plan doc. No `git add -A`.
3. Do NOT commit `docs/plans/kimi-running-log.md` (gitignored).

## Guardrails
- Action strings and table names are wire values — copy them from source
  (`test_email_mailboxes`, `test_email_messages`, `test_email_events`,
  `test_email_domains`, …), never invent.
- Time-window logic (24h/7d) must use `vi.setSystemTime` with fixed ISO
  fixtures.
- The domains "reactivate-on-readd" branch is the likeliest place for a
  chain-shape surprise (`.select().eq().maybeSingle()` style) — match the
  real chain from source.
- Stuck = marker + reason + report. Never weaken assertions.

## Report back to Claude
- Branch + commits; tests added per file; real findings (file:line,
  consequence); full-suite before/after + typecheck; **verified vs NOT
  verified** — mocks can't prove live `test_email_*` schema matches the
  selects; name that and any other structural gaps.
