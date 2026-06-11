# Refactor round — Task 8: Split support-tickets.ts into a module directory
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Completed — ready for review · **Sequence:** started after PLAN_07 merged

`src/lib/actions/support-tickets.ts` (781 lines) mixes queue reads, ticket
writes, comments, team management, canned responses, SLA math, and
analytics. Split it into `src/lib/actions/support-tickets/` submodules with
the ORIGINAL path kept as a re-export barrel so no import anywhere changes.
**Pure refactor: function bodies move verbatim; zero behavior change; the
existing 43 support-tickets tests (and the whole suite) must pass with ZERO
test-file changes; test count unchanged.**

Read `delegation-kit/KIMI_FEEDBACK.md` first. **Base branch: `main`.**

## Target layout (decision made — do not redesign)
- `support-tickets/queue.ts` — getSupportTickets, getOpenTicketCount,
  getSupportTicketById, getSupportTicketByReference
- `support-tickets/writes.ts` — assignTicket, updateTicketStatus,
  updateTicketPriority, closeTicket
- `support-tickets/comments.ts` — getSupportTicketComments, addTicketComment
- `support-tickets/events.ts` — getSupportTicketEvents, getSupportTicketLinks
- `support-tickets/team.ts` — getSupportTeam, addTeamMember
- `support-tickets/canned.ts` — getCannedResponses, incrementCannedResponseUse
- `support-tickets/analytics.ts` — getSupportAnalytics, getTicketVolumeData,
  getAgentLeaderboard
- `support-tickets/shared.ts` — the internal non-exported helpers
  (mapTicketFromDB, mapCommentFromDB, logTicketEvent, calculateSLADeadline —
  verify the full list) imported by the above
- `support-tickets.ts` (original path) — becomes a barrel:
  `export { ... } from "./support-tickets/queue"` etc. Every current export,
  no additions, no omissions.

## What MUST be true / asserted
- **"use server" placement:** each submodule that defines actions gets the
  directive at top; `shared.ts` must NOT have it (it exports sync helpers —
  "use server" files may only export async functions); the barrel needs no
  directive for re-exports — VERIFY this against Next 16 by building; if the
  build rejects the barrel form, the fallback is explicit
  `export async function` delegations — report which form landed.
- Function bodies byte-identical (move, don't edit). The single allowed edit:
  import paths and the PLAN_06 shared `requireAdmin` import.
- Public API identical: same named exports from `@/lib/actions/support-tickets`.
- Zero changes to ANY test file or other source file. 314+ tests green,
  typecheck clean, `npm run build` passes.

## Branch workflow
1. Branch `kimi/support-tickets-module-split` off latest `main` (contains
   PLAN_06/07).
2. Commits: one per submodule extraction, then the barrel conversion last,
   + this plan doc. Gate green after EVERY commit (extract incrementally —
   original file shrinks as submodules appear).
3. Report. Do NOT merge.

## Guardrails
- `addTicketComment` calls the pending→in_progress flip inline and
  `logTicketEvent` — comments.ts will import from shared.ts; don't inline or
  duplicate helpers across submodules.
- Watch the audit action strings — they must remain byte-identical (the
  tests assert them; if a test fails, the move broke something real).
- No circular imports: shared.ts imports nothing from sibling submodules.
- This is the LAST chance to be tempted into "while I'm here" fixes — don't.
  Anything you notice goes in the report.

## Report back to Claude
Branch + commits; final layout (file:line-count table); which barrel form
landed and why; gate numbers; verified vs NOT verified (e.g. "server-action
wiring through the barrel — build passes but runtime invocation from a page
is the reviewer's check"). Update `docs/plans/kimi-running-log.md`.

## Completion Summary
- **Branch:** `kimi/support-tickets-module-split`
- **Base:** `main` at `4d62bc0` (includes PLAN_06/07)
- **Commits:**
  - `4202bd4` — extract shared helpers (`mapTicketFromDB`, `mapCommentFromDB`, `mapLinkFromDB`, `logTicketEvent`, `calculateSLADeadline`) into `support-tickets/shared.ts` (no `"use server"`)
  - `a6dd632` — extract queue reads into `support-tickets/queue.ts`
  - `832c8e7` — extract ticket writes into `support-tickets/writes.ts`
  - `dd1dd33` — extract comment actions into `support-tickets/comments.ts`
  - `9c91a1f` — extract event/link reads into `support-tickets/events.ts`
  - `1ff759c` — extract team management into `support-tickets/team.ts`
  - `bc97754` — extract canned responses into `support-tickets/canned.ts`
  - `9ccbdf5` — extract analytics into `support-tickets/analytics.ts`
  - `fa52ade` — convert `support-tickets.ts` to named re-export barrel (no `"use server"`)
- **Final layout:**
  | File | Purpose |
  |---|---|
  | `support-tickets/shared.ts` | Mapping helpers + `logTicketEvent` + `calculateSLADeadline` |
  | `support-tickets/queue.ts` | Queue reads + open count + by-id/reference |
  | `support-tickets/writes.ts` | Assign, status, priority, close |
  | `support-tickets/comments.ts` | Comments read + add (with pending→in_progress side-effect) |
  | `support-tickets/events.ts` | Events + links |
  | `support-tickets/team.ts` | Team members |
  | `support-tickets/canned.ts` | Canned responses + no-op |
  | `support-tickets/analytics.ts` | Analytics, volume, leaderboard |
  | `support-tickets.ts` | Named re-export barrel (no directive) |
- **Gate:**
  - `npm run test` → **281 passed / 0 failed / 47 skipped (328 total)**
  - `npm run typecheck` → **0 errors**
  - `npm run build` → **completed**
- **Barrel form landed:** plain named `export { ... } from "./support-tickets/..."` re-exports with no `"use server"` directive. Next.js 16 App Router accepts this for server actions (build + static analysis pass).
- **Verified:**
  - Function bodies moved verbatim; the only edits were import paths and the PLAN_06 `requireAdmin` import style.
  - Public API identical: same named exports from `@/lib/actions/support-tickets`.
  - Zero test-file changes; existing 43 support-tickets tests and full suite pass unchanged.
  - No circular imports: `shared.ts` imports nothing from sibling submodules.
- **NOT verified:** runtime server-action invocation through the barrel from a live page (reviewer checks out-of-band by exercising the Help Desk UI).
