# Lathe Studio Admin Console

Internal admin console for the Lathe Studio platform. Runs on port **3001** alongside the main lathe-studio app.

## Quick Reference

| Topic | File |
|-------|------|
| Full agent guide (commands, testing, conventions, troubleshooting) | [AGENTS.md](AGENTS.md) |
| Project README (setup, features, env vars) | [README.md](README.md) |
| Incomplete features & orphaned code | [TODO.md](TODO.md) |
| Help desk main-app integration guide | [HELP_DESK_SETUP.md](HELP_DESK_SETUP.md) |
| Support ticket system plan | [docs/support-ticket-system-plan.md](docs/support-ticket-system-plan.md) |

## Tech Stack (at a glance)

- **Framework**: Next.js 16, App Router, TypeScript 5.8
- **Styling**: Tailwind CSS 4.0, shadcn/ui (New York style, slate+amber, dark-only)
- **Auth**: Clerk (`@clerk/nextjs`) — admin gate via `publicMetadata.isAdmin`
- **Database**: Supabase with service-role client (bypasses RLS)
- **Tables/Forms**: TanStack Table v8, React Hook Form + Zod
- **State**: Zustand (sidebar), Recharts (charts)

## What the Console Does

The admin console provides real-time management of the Lathe Studio platform via service-role Supabase access:

- **Users** — Search Clerk users enriched with lathe-studio DB data; view projects
- **Organizations** — Manage trial states (`active` → `soft_locked` → `hard_locked` → `paid`), view members, override `org_settings`
- **Projects** — Cross-org project search with detail pages showing members, test cases, test runs, and soft-delete/restore
- **API Keys** — View and revoke org/project-scoped keys with usage history
- **Integrations** — Monitor connection health across all providers; disconnect/retry
- **Build Queue** — View CI/CD build events; assign orphaned builds to projects
- **Sandbox Leads** — Track self-service signups and demo requests; mark converted
- **Help Desk** — Full ticket queue with assignment, SLA tracking, team management, analytics
- **Billing** — MRR/ARR, trial funnel metrics, invoices, coupons
- **Audit Logs** — Two trails: admin actions (`/support/activity`) and lathe app events (`/audit-logs`)
- **System** — Health checks, error logs, feature flags, announcements

## Critical Rules

1. **All write operations must call `logAdminAction()`** — see [AGENTS.md](AGENTS.md)
2. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client** — service-role client only in Server Components, Server Actions, and Route Handlers
3. **Always verify admin status in Server Actions and API routes** — middleware alone is not sufficient
4. **Dark mode only** — `class="dark"` is fixed on `<html>`; never add light-mode variants

## Key Design Decisions

- **Trial + paid-only model**: No tiered plans. Orgs have `trial_lock_state` (`active` | `soft_locked` | `hard_locked` | `paid`). All real org data comes from lathe-studio's `organizations` table via `clerk_org_id`.
- **Dual role system**: Clerk org roles for org-level access, `project_members` table for project-level permissions.
- **Shared database**: Both apps (lathe-studio and this admin console) share the same Supabase project. Admin uses service role to bypass RLS and read all tables.
- **Schema unification**: A dedicated migration (`20260601_unify_shared_schemas.sql`) resolved schema conflicts for shared tables (`admin_announcements`, `support_tickets`, `support_ticket_comments`, `support_sla_config`).
