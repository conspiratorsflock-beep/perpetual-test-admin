# Lathe Studio Admin Console

A comprehensive admin console for managing the Lathe Studio platform.

## Features

- **User Management**: Search, view, edit, delete users; promote/revoke admin access; impersonation
- **Organization Management**: View orgs, manage trial states (active/soft-locked/hard-locked/paid), view members, override org settings
- **Project Management**: Cross-org project search, detail pages with members, test cases, test runs, and settings
- **API Key Management**: View and revoke org/project-scoped API keys
- **Integration Health**: Monitor org and project integration status across all providers (reads real per-provider connection tables)
- **Builds**: Track CI/CD builds and manual test runs across projects (reads lathe-studio `builds` table)
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
NEXT_PUBLIC_ENV_LABEL=          # "staging" | "production" — shown in the UI banner
ALLOW_ADMIN_BOOTSTRAP=          # "true" to enable /api/make-admin in production
```

## Deployment

This app deploys to Vercel. `vercel.json` sets the framework preset to `nextjs` only; routing, regions, and cron jobs are left to Vercel defaults.

### Staging vs Production

| Concern | Staging | Production |
|---|---|---|
| `NEXT_PUBLIC_ENV_LABEL` | `staging` | `production` |
| `ALLOW_ADMIN_BOOTSTRAP` | `true` recommended for onboarding | Keep unset/`false` unless emergency admin creation is required |
| Vercel Deployment Protection | Disable or use Password Protection so CI/preview builds are reachable | Keep enabled |
| Build-time Clerk keys | Dummy publishable key is sufficient for the build step (runtime keys are required for auth) | Real keys required at runtime |

### Build verification with dummy keys

The production build does not need live Clerk credentials to compile. Verify locally with placeholder keys:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_Y2xlcmsuZXhhbXBsZS5jb20k" \
CLERK_SECRET_KEY="sk_test_placeholder" \
npm run build
```

A validly-formatted dummy publishable key is enough; the build only validates key shape, not that the key is live.

### Production checklist

- [ ] Real Clerk keys configured in Vercel project settings
- [ ] Supabase service-role key configured
- [ ] Stripe key configured (if billing features are used)
- [ ] `NEXT_PUBLIC_ENV_LABEL=production`
- [ ] `ALLOW_ADMIN_BOOTSTRAP` left unset unless emergency bootstrap is required
- [ ] Vercel Deployment Protection enabled

## Database Setup

Run migrations in order:

1. `supabase/migrations/20260310_admin_console.sql` — Core admin tables
2. `supabase/migrations/20260601_unify_shared_schemas.sql` — Unify shared schemas with lathe-studio

> **Note:** `20260312_api_calls_tracking.sql`, `20260615_phase4_operational_tables.sql`, and `20260620_lathe_audit_logs.sql` were retired and deleted. The admin console reads lathe-studio's real integration, build, and audit tables instead.

### Admin Tables

| Table | Purpose |
|-------|---------|
| `admin_audit_logs` | Admin action audit trail |
| `feature_flags` | Feature flags with org/user targeting |
| `impersonation_tokens` | Secure user impersonation |
| `admin_announcements` | In-app announcements |
| `system_health_checks` | Service health monitoring |
| `admin_error_logs` | Aggregated error tracking |
| `system_settings` | Key-value config |

### Shared Tables (from lathe-studio)

| Table | Purpose |
|-------|---------|
| `organizations` | Orgs with trial state, Stripe IDs |
| `projects` | Projects with requirements toggle |
| `users` | Lathe-studio user records |
| `project_members` | Project-level roles |
| `org_settings` | Per-org feature configuration |
| `api_keys` | Org/project-scoped API keys |
| `cicd_connections` | CI/CD provider connections |
| `slack_connections` | Slack workspace connections |
| `teams_connections` | Microsoft Teams connections |
| `jira_connections` | Jira site connections |
| `azure_devops_connections` | Azure DevOps connections |
| `builds` | CI/CD builds and manual test runs |
| `audit_logs` | App-level audit trail |
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
    audit-logs/        # App-level audit log viewer (lathe-studio audit_logs)
    billing/           # Billing dashboard
    builds/            # Build viewer (lathe-studio builds table)
    dashboard/         # Main dashboard
    docs/              # Documentation pages
    help-desk/         # Ticket queue, my tickets, team, analytics
    integrations/      # Integration health dashboard (real provider tables)
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
- **App events** → `audit_logs` (lathe-studio table) via lathe-studio app code; viewed in `/audit-logs`

### Database Access
Uses service-role Supabase client (`supabaseAdmin`) to bypass RLS. Never expose to client.

## Security

- Admin check via Clerk middleware
- Service role Supabase client for admin operations
- Audit logging on all write operations
- Impersonation tokens with expiry and single-use
