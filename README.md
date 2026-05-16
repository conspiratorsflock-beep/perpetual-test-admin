# Lathe Studio Admin Console

A comprehensive admin console for managing the Lathe Studio platform.

## Features

- **User Management**: Search, view, edit, delete users; promote/revoke admin access; impersonation
- **Organization Management**: View orgs, manage trial states (active/soft-locked/hard-locked/paid), view members, override org settings
- **Project Management**: Cross-org project search, detail pages with members, test cases, test runs, and settings
- **API Key Management**: View and revoke org/project-scoped API keys
- **Integration Health**: Monitor org and project integration status across all providers
- **Build Queue**: Track CI/CD build events flowing into Lathe Studio
- **Sandbox Leads**: Track self-service signups, demo requests, and conversion funnel
- **Help Desk**: Full ticket queue, assignment, SLA tracking, team management, analytics
- **Audit Logs**: Two audit trails — admin actions (`/support/activity`) and app-level events (`/audit-logs`)
- **Feature Flags**: Org/user-targeted feature flags
- **Announcements**: In-app admin announcements with tier/org targeting
- **Billing Dashboard**: Trial metrics, MRR/ARR, conversion rates, invoices, coupons
- **System Health**: Service status monitoring, error logs, configuration
- **Internal Docs**: Markdown-based documentation

## Tech Stack

- Next.js 16 with App Router
- TypeScript 5.8
- Tailwind CSS 4.0
- shadcn/ui (New York style)
- Clerk Authentication
- Supabase (Service Role)
- TanStack Table v8
- Recharts

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in your Clerk and Supabase credentials

# Run development server
npm run dev
```

Visit http://localhost:3001

## Environment Variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
```

## Database Setup

Run migrations in order:

1. `supabase/migrations/20260310_admin_console.sql` — Core admin tables
2. `supabase/migrations/20260601_unify_shared_schemas.sql` — Unify shared schemas with lathe-studio
3. `supabase/migrations/20260615_phase4_operational_tables.sql` — Integration connections, sandbox leads, build queue
4. `supabase/migrations/20260620_lathe_audit_logs.sql` — App-level audit trail

### Admin Tables

| Table | Purpose |
|-------|---------|
| `admin_audit_logs` | Admin action audit trail |
| `feature_flags` | Feature flags with org/user targeting |
| `impersonation_tokens` | Secure user impersonation |
| `admin_announcements` | In-app announcements |
| `system_health_checks` | Service health monitoring |
| `admin_error_logs` | Aggregated error tracking |
| `api_usage_daily` | Daily API metrics |
| `system_settings` | Key-value config |

### Operational Tables (shared with lathe-studio)

| Table | Purpose |
|-------|---------|
| `integration_connections` | Org/project integration status |
| `sandbox_leads` | Self-service signups and demo requests |
| `build_queue_items` | CI/CD build events |
| `lathe_audit_logs` | App-level audit trail |

### Shared Tables (from lathe-studio)

| Table | Purpose |
|-------|---------|
| `organizations` | Orgs with trial state, Stripe IDs |
| `projects` | Projects with requirements toggle |
| `users` | Lathe-studio user records |
| `project_members` | Project-level roles |
| `org_settings` | Per-org feature configuration |
| `api_keys` | Org/project-scoped API keys |
| `test_cases` | Test cases with steps, priority, status |
| `test_runs` | Test runs with environment, configuration |
| `support_tickets` | Help desk tickets |
| `support_ticket_comments` | Ticket conversations |
| `support_team_members` | Support team config |

## Admin Access

To grant admin access:
1. Go to Clerk Dashboard
2. Find the user
3. Set Public Metadata: `{"isAdmin": true}`

Or use the API:
```bash
curl -X POST http://localhost:3001/api/make-admin \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_xxx"}'
```

## Project Structure

```
src/
  app/                 # Next.js app router pages
    (auth)/            # Sign-in, sign-up, unauthorized
    api/               # API routes (impersonate, make-admin)
    audit-logs/        # Lathe audit log viewer
    billing/           # Billing dashboard
    builds/            # Build queue viewer
    dashboard/         # Main dashboard
    docs/              # Documentation pages
    help-desk/         # Ticket queue, my tickets, team, analytics
    integrations/      # Integration health dashboard
    leads/             # Sandbox leads
    organizations/     # Org list + detail (with Settings tab)
    projects/          # Project list + detail (with Test Cases + Test Runs tabs)
    api-keys/          # API key management
    support/           # Activity, flags, announcements
    system/            # Health, logs, config
    users/             # User list + detail
  components/
    ui/               # shadcn/ui components
    layout/           # Shell, sidebar, header
  lib/
    actions/          # Server Actions
    audit/            # Audit logging
    clerk/            # Clerk utilities
    supabase/         # Supabase clients
  types/              # TypeScript types
  content/docs/       # Markdown documentation
```

## Key Patterns

### Server Actions
All data mutations use Server Actions in `src/lib/actions/`:
- Marked with `"use server"`
- Always call `logAdminAction()` after write operations
- Return plain objects (not classes)

### Audit Logging
Two audit trails:
- **Admin actions** → `admin_audit_logs` via `logAdminAction()`
- **App events** → `lathe_audit_logs` via lathe-studio app code

### Database Access
Uses service-role Supabase client (`supabaseAdmin`) to bypass RLS. Never expose to client.

## Security

- Admin check via Clerk middleware
- Service role Supabase client for admin operations
- Audit logging on all write operations
- Impersonation tokens with expiry and single-use
