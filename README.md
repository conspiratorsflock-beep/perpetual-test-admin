# Perpetual Test Admin Console

A comprehensive admin console for managing the Perpetual Test platform.

## Features

- **User Management**: Search, view, edit, delete users; promote/revoke admin access; impersonation
- **Organization Management**: View orgs, manage tiers, view members
- **Project Management**: Cross-org project search and overview
- **Support Tools**: Activity logs, feature flags, announcements
- **Billing Dashboard**: MRR/ARR metrics, invoices, coupons
- **System Health**: Service status monitoring, logs, configuration
- **Internal Docs**: Markdown-based documentation

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
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

Run the migration in `supabase/migrations/20260310_admin_console.sql` to create:
- `admin_audit_logs`
- `feature_flags`
- `impersonation_tokens`
- `admin_announcements`
- `system_health_checks`
- `admin_error_logs`

## Admin Access

To grant admin access:
1. Go to Clerk Dashboard
2. Find the user
3. Set Public Metadata: `{"isAdmin": true}`

## Project Structure

```
src/
  app/              # Next.js app router pages
  components/       # React components
    ui/            # shadcn/ui components
    users/         # User management components
  lib/
    actions/       # Server actions
    audit/         # Audit logging
    clerk/         # Clerk utilities
    supabase/      # Supabase clients
  types/           # TypeScript types
  content/docs/    # Markdown documentation
```

## Audit Logging

All admin actions are automatically logged to `admin_audit_logs`. The `logAdminAction()` helper is available in `src/lib/audit/logger.ts`.

## Security

- Admin check via Clerk middleware
- Service role Supabase client for admin operations
- Audit logging on all write operations
- Impersonation tokens with expiry and single-use
