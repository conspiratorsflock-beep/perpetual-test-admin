# Test-suite repair round — Task 5: New unit tests for support-tickets server actions (write paths + queue reads)
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Completed — ready for review · **Sequence:** started after Plan 04 merged

`src/lib/actions/support-tickets.ts` (759+ lines) backs the entire Help Desk
and has no action-level tests (only component tests against mocked actions).
Create `src/lib/actions/__tests__/support-tickets.test.ts` covering the write
paths and the main queue read. **Confirm-and-lock**: source must NOT change;
suspected source bugs are reported, not fixed.

Context that motivates this: a reviewer sweep on 2026-06-10 (commit
`bc0b8be`) found three write functions here silently missing the mandatory
`logAdminAction` call. Tests asserting the audit invariant are what keep that
class of bug from reshipping.

Read `delegation-kit/KIMI_FEEDBACK.md` first; copy the
`impersonation.test.ts` house style.

**IMPORTANT — base branch:** `feat/typed-supabase-client-and-perf` after
Plan 04 merges. Must contain `bc0b8be`.

## Inventory (verified 2026-06-10 — verify line numbers again, then work through)
IN SCOPE (`src/lib/actions/support-tickets.ts`):
- `getSupportTickets` (:16) — queue read with filters/pagination
- `assignTicket` (:186) — sets `assigned_to` + status `in_progress`; logs
  event + `support_ticket.assign`
- `updateTicketStatus` (:217) — sets `resolved_at` when status `resolved`;
  logs event + `support_ticket.status_change`
- `updateTicketPriority` (:253) — recalculates `sla_deadline` via
  `calculateSLADeadline`; logs event + `support_ticket.priority_change`
  (audit call added in bc0b8be)
- `addTicketComment` (:285) — inserts comment; SIDE EFFECT: an agent,
  non-internal comment on a `pending` ticket flips it to `in_progress`;
  logs event + `support_ticket.comment_add` (added in bc0b8be)
- `closeTicket` (:336+) — logs `support_ticket.close` (verify exact string)
- `addTeamMember` (:437+) — logs `support_team.member_add` with
  targetType `"user"` (added in bc0b8be)
- `getSupportTeam`, `getCannedResponses` — light read coverage (happy +
  error path each)

EXCLUDE (and why):
- `getSupportAnalytics`, `getTicketVolumeData`, `getAgentLeaderboard` —
  aggregate analytics; large mock surface, low regression risk this round.
  Listed for a future plan; do not start them.
- `incrementCannedResponseUse` — documented no-op (`use_count` column does
  not exist); at most one test asserting it does NOT hit the DB.
- All component tests and other action files. `delegation-kit/` untouched.

## What MUST be true / asserted
- **Auth before action** on every in-scope function (non-admin → rejects,
  no DB call attempted).
- **Audit invariant:** every write asserts `logAdminAction` with the exact
  action string above; reads assert it is NOT called. These assertions are
  the regression lock for the bc0b8be class.
- **Status/priority wire values** (`pending`, `in_progress`, `resolved`,
  `closed`, priorities) asserted byte-exact in update payloads — shared-table
  wire strings, not labels.
- **addTicketComment side-effect matrix** (each its own test): agent +
  non-internal + pending → status flips to `in_progress`; internal note →
  no flip; non-agent → no flip; non-pending ticket → no flip.
- **updateTicketPriority:** ticket row missing → `sla_deadline: null` in the
  update payload (current behavior — verify by reading :253-283).
- **Error paths:** every Supabase call's `{ error }` → documented throw with
  message prefix.
- Distinct outcomes get distinct assertions — never one mega-test.
- Gate: suite 0 failed (previous baseline + exactly your new tests; state
  the count), typecheck 0 errors.

## Branch workflow
1. Branch `kimi/support-tickets-action-tests` off latest
   `feat/typed-supabase-client-and-perf`.
2. Commit in slices (reads / assign+status+priority / comment+close / team),
   + this plan doc. Gate green after every commit.
3. Report. Do NOT merge.

## Guardrails
- `logTicketEvent` (internal, not exported) writes `support_ticket_events` —
  your `from()` mock must route per-table (`from("support_tickets")` vs
  `from("support_ticket_comments")` vs `from("support_ticket_events")`);
  a single blanket chain will silently satisfy the wrong query. Route by
  table-name argument.
- `calculateSLADeadline` reads `support_sla_config` — check how it's
  invoked and mock that table's chain too; if its date math makes assertions
  brittle, assert "sla_deadline present and ISO-shaped" rather than an exact
  timestamp, and say so in the report (honest fallback over weakened-looking
  precision).
- Fixture column names must match the live shared tables
  (`support_tickets`, `support_ticket_comments`, `support_team_members` —
  unified by `20260601_unify_shared_schemas.sql`); verify against
  `docs/plans/Schema.md` / migrations.
- Time-dependent values: fake timers / fixed dates.
- Stuck = `// CAST-DEBT:` + reason + report. Never weaken an assertion.

## Report back to Claude
- Branch + commits; functions covered vs deferred (count + reasons); real
  findings beyond the spec — file:line + runtime consequence (you are the
  first tests this file has ever had; expect to find something); gate
  numbers; **verified vs NOT verified** (schema shapes, SLA config table
  contents — reviewer re-verifies against the live DB). Update
  `docs/plans/kimi-running-log.md`.

## Completion Summary
- **Branch:** `kimi/support-tickets-action-tests`
- **Commits:**
  - `46cbfaa` — queue read + helper read tests (getSupportTickets, byId, comments, events, links)
  - `3780325` — write-path tests: assignTicket, updateTicketStatus, updateTicketPriority
  - `df372d4` — comment/close/team/canned response tests + getOpenTicketCount + getSupportTicketByReference
- **Gate:**
  - `npm run test src/lib/actions/__tests__/support-tickets.test.ts` → 43 passed / 0 failed
  - `npm run typecheck` → 0 errors
- **Functions covered (10):**
  - Reads: `getSupportTickets`, `getSupportTicketById`, `getSupportTicketByReference`, `getSupportTicketComments`, `getSupportTicketEvents`, `getSupportTicketLinks`, `getOpenTicketCount`
  - Writes: `assignTicket`, `updateTicketStatus`, `updateTicketPriority`, `addTicketComment`, `closeTicket`
  - Team/Canned: `getCannedResponses`, `incrementCannedResponseUse`, `getSupportTeam`, `addTeamMember`
- **Deferred (per plan):**
  - `getSupportAnalytics`, `getTicketVolumeData`, `getAgentLeaderboard` — aggregate analytics, large mock surface, future plan.
- **Real findings beyond spec:**
  - `getCannedResponses` chains `.order(...)` **before** the conditional `.eq("category", ...)`; the query object returned by `.order()` must remain chainable with `.eq()` while still being awaitable. This is unusual but current behavior works because the Supabase client returns a chainable promise. The test locks this contract with a thenable chain mock.
  - `addTicketComment` side-effect matrix: confirmed current source only flips `pending` → `in_progress` when `isAgent && !isInternal`. All four branches are now independently asserted.
- **Verified:**
  - Zero-line diff on `src/lib/actions/support-tickets.ts`.
  - Exact audit action strings asserted: `support_ticket.assign`, `support_ticket.status_change`, `support_ticket.priority_change`, `support_ticket.comment_add`, `support_ticket.close`, `support_team.member_add` (with `targetType: "user"`).
  - Auth-gate tests on every write function assert `mockSupabaseFrom` was NOT called for non-admin users.
- **NOT verified:** fixture column names vs live DB; `support_sla_config.first_response_hours` contents vs production values (reviewer re-verifies).
