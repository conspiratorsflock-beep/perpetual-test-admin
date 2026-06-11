# Medium — Task: Tests for support-tickets/analytics.ts (3 functions)
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER PLAN_12 lands — main's log must show the reviewer's "Remove executed PLAN_12 doc" commit (`git log main --oneline -5`).

**Confirm-and-lock**: tests only; `src/lib/actions/support-tickets/analytics.ts`
must not change. It was isolated by the PLAN_08 module split but is the last
untested support-tickets submodule. If a test reveals a real bug, REPORT it
with file:line — do not fix it and do not write a test that enshrines the bug
as correct.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/lib/actions/support-tickets/analytics.ts` (218 lines, 3 exports, all
  `requireAdmin()`-gated):
  - `getSupportAnalytics({startDate,endDate})` — 1 gated query on
    `support_tickets` (`.select().gte().lte()`), then if any rows: thenable
    `.select()` on `support_team_members` and `.select().in().order()` on
    `support_ticket_comments`. Aggregates byStatus/byPriority/byCategory,
    openTickets, SLA compliance, avg resolution + first-response minutes.
  - `getTicketVolumeData({startDate,endDate})` — single query; buckets
    created/resolved counts per ISO date; sorted ascending.
  - `getAgentLeaderboard({startDate,endDate})` — `support_team_members`
    then `support_tickets` filtered `.in("assigned_to", ...)`; per-agent
    resolved count, avg resolution, openAssigned; sorted by resolved desc.
- New file: `src/lib/actions/__tests__/support-tickets-analytics.test.ts`.
- Pattern to copy: `src/lib/actions/__tests__/dashboard.test.ts` — per-table
  `mockSupabaseFrom.mockImplementation((table) => ...)` with chain shapes
  matching each table, `vi.mock` of `@/lib/clerk/admin-check`, and
  `vi.setSystemTime` for time-dependent branches.

## What MUST be true / asserted
- Non-admin gate ×3: `requireAdmin` rejecting → action rejects "Unauthorized"
  AND `supabaseAdmin.from` was never called.
- Error paths ×3 (and the agents/tickets sub-queries of the leaderboard):
  Supabase `error` → rejects with the wrapped message (e.g.
  "Failed to fetch analytics: boom").
- `getSupportAnalytics`:
  - tally correctness for byStatus/byPriority/byCategory on a mixed fixture;
    openTickets counts exactly `open|in_progress|pending` (wire values, not
    display strings).
  - SLA: met vs missed with `resolved_at`; UNRESOLVED ticket compares
    deadline against NOW (use `vi.setSystemTime`, one fixture each side);
    no `sla_deadline` on any row → `slaCompliancePct === 100`.
  - avg resolution: rounded mean, negative/zero durations excluded.
  - first response: only comments whose `author_id` is in
    `support_team_members` count; FIRST agent comment per ticket wins
    (fixture with an earlier non-agent comment and two agent comments).
  - zero tickets → returns zeros AND the comments/team queries are never
    made (assert `from` called once).
- `getTicketVolumeData`: created and resolved bucketed on their own dates
  (fixture resolving on a different day than created); rows with null
  `created_at` skipped; output sorted by date ascending.
- `getAgentLeaderboard`: zero agents → `[]` AND no tickets query; agents
  with no tickets appear with zeros; sort order by resolved desc verified
  with ≥3 agents; `openAssigned` counts the three open wire statuses.
- Pure test-addition: source untouched (`git diff main -- src/lib/actions`
  empty except tests); full suite = previous baseline + your new tests;
  `npm run typecheck` clean.

## Branch workflow
1. Confirm the sequence precondition, then create
   `kimi/support-analytics-tests` off local main (no origin fetch).
2. One commit for the test file + one for this plan doc. No `git add -A`.
3. Do NOT commit `docs/plans/kimi-running-log.md` (gitignored).
4. Gate green after EVERY commit. Report full-suite numbers, never per-file.

## Guardrails
- Chain shapes differ per table within ONE function — `support_tickets`
  needs `.select().gte().lte()` resolving, `support_team_members` needs a
  thenable `.select()`, comments need `.select().in().order()`. Build the
  mock per-table like dashboard.test.ts; don't force one shape everywhere.
- Status values are wire values (`in_progress`, not "In Progress").
- Date fixtures: use fixed ISO strings + `vi.setSystemTime`; never
  `Date.now()` math in fixtures.
- Stuck = leave a marker + reason + report. Never weaken an assertion to
  get green.

## Report back to Claude
- Branch + commits; tests added (count); real findings (file:line,
  consequence — especially any aggregation bug you had to write AROUND);
  full-suite before/after + typecheck; **verified vs NOT verified** — your
  mocks cannot prove the chains match real PostgREST behavior or live
  schema; list that explicitly.
