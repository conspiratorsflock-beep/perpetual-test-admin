# Admin Console — Implementation Tracker

Tracks incomplete features, orphaned code, and pending integrations across the codebase.
Last updated: 2026-03-19.

---

## Help Desk

### Analytics (`/help-desk/analytics`)
- [ ] Replace hardcoded `mockStats` with real server action data (`src/app/help-desk/analytics/page.tsx:21`)
- [ ] Replace hardcoded agent performance table (Sarah Johnson, Mike Chen, Alex Rivera) with real data
- [ ] Implement ticket volume chart (currently shows "Volume chart coming soon")
- [ ] Implement CSAT data pipeline — score is hardcoded `4.6`; server action returns `satisfactionScore: null` (`src/lib/actions/support-tickets.ts:454`)
- [ ] Calculate `avgResponseTime` and `avgResolutionTime` in `getSupportTicketAnalytics()` (currently hardcoded `0`)

### Team (`/help-desk/team`)
- [ ] Implement skill-based routing configuration (currently shows "coming soon" placeholder at line 207)

### Canned Responses
- [ ] Add `/help-desk/canned-responses` route — `CannedResponsesView.tsx` exists but has no page or sidebar entry

---

## Orphaned Components

These components are not referenced by any route. They were part of an earlier tab-based `HelpDeskShell` design that was replaced by separate pages.

| Component | Notes |
|-----------|-------|
| `src/components/help-desk/HelpDeskShell.tsx` | Original single-page tab layout — unused |
| `src/components/help-desk/CannedResponsesView.tsx` | Only referenced from `HelpDeskShell` |
| `src/components/help-desk/SupportAnalytics.tsx` | Only referenced from `HelpDeskShell` |
| `src/components/help-desk/TeamView.tsx` | Only referenced from `HelpDeskShell` |

**Options:** either wire `CannedResponsesView` into a new route and delete the rest, or delete all four if the content has been superseded by the individual route pages.

---

## Projects (`/projects`)

- [ ] Replace `mockProjects` array with real Supabase data (`src/app/projects/page.tsx:20`)
- [ ] Implement server action for fetching projects from the database

---

## Dashboard (`/dashboard`)

- [ ] Replace sparkline placeholder data with real historical metrics (`src/app/dashboard/page.tsx:29`)

---

## System

### Health (`/system/health`)
- [ ] Implement historical latency charts (currently shows "coming soon" at line 241)

---

## Main App Integration (not yet built)

These live in the Perpetual Test main app (`/Users/bryanjadrich/DEV/Perpetual Test/perpetual-test/`), not here. See `HELP_DESK_SETUP.md` for full code examples.

- [ ] `POST /api/support/tickets` — route handler for ticket creation
- [ ] `GET /api/support/tickets?userId=` — route for fetching a user's tickets
- [ ] `CreateTicketForm` component — user-facing ticket submission form
- [ ] `TicketStatus` component — user-facing ticket list view

---

## Infrastructure / Notifications

- [ ] Run database migration: `supabase/migrations/20260313_support_tickets.sql`
- [ ] Set up email notifications for ticket events (SendGrid or Resend)
- [ ] Configure Slack/Discord webhook alerts via `SLACK_WEBHOOK_URL` env var
- [ ] Train support team on canned responses workflow

---

## Docs to Update

- [ ] `.claude/help-desk.md` — references wrong migration filename (`20260311` → `20260313`)
- [ ] `HELP_DESK_SETUP.md` — same wrong migration filename; also doesn't distinguish "guide for main app" from "already implemented"
