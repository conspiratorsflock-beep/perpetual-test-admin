# Lathe Studio Admin Console — Agent Guide

## Project Overview

This is an internal admin console for the Lathe Studio platform. It provides comprehensive tools for managing users, organizations, projects, billing, feature flags, system health, help desk, integrations, build queue, sandbox leads, and audit logging.

**Key Characteristics:**
- Dark-mode only admin interface (slate + amber accent theme)
- Server-side rendering with Next.js App Router
- All admin actions are audited and logged
- Impersonation capabilities for user support
- Service-role access to Supabase (bypasses RLS)
- **Trial + paid-only pricing model** — no tiered plans. Orgs have `trial_lock_state` (`active` | `soft_locked` | `hard_locked` | `paid`)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS 4.0 |
| UI Components | shadcn/ui (New York style) |
| Authentication | Clerk (@clerk/nextjs) |
| Database | Supabase (service role client) |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Forms | react-hook-form + Zod |
| State | Zustand |
| Icons | Lucide React |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   │   ├── sign-in/[[...sign-in]]/
│   │   ├── sign-up/[[...sign-up]]/
│   │   └── unauthorized/
│   ├── api/               # API routes
│   │   ├── impersonate/   # User impersonation tokens (POST)
│   │   └── make-admin/    # Admin promotion utility
│   ├── audit-logs/        # Lathe audit log viewer (app-level events)
│   ├── billing/           # Billing dashboard (MRR, trials, invoices, coupons)
│   ├── builds/            # Build queue viewer (CI/CD events)
│   ├── dashboard/         # Main dashboard
│   ├── docs/[[...slug]]/  # Documentation pages
│   ├── help-desk/         # Support ticket system
│   │   ├── queue/         # Ticket queue
│   │   ├── my-tickets/    # Agent's assigned tickets
│   │   ├── team/          # Support team management
│   │   └── analytics/     # Help desk analytics
│   ├── integrations/      # Integration health dashboard
│   ├── leads/             # Sandbox leads (signups/demo requests)
│   ├── organizations/     # Org management
│   │   └── [id]/          # Org detail with Overview, Members, Projects, Billing, Settings, Activity tabs
│   ├── projects/          # Project management
│   │   └── [id]/          # Project detail with Overview, Members, Test Cases, Test Runs, Settings tabs
│   ├── api-keys/          # API key management (view/revoke)
│   ├── support/           # Support tools
│   │   ├── activity/      # Admin audit logs
│   │   ├── announcements/ # Admin announcements
│   │   └── flags/         # Feature flags
│   ├── system/            # System health
│   │   ├── config/        # System config
│   │   ├── health/        # Health checks
│   │   └── logs/          # Error logs
│   ├── users/             # User management
│   │   └── [id]/          # User detail page
│   ├── layout.tsx         # Root layout with ClerkProvider
│   ├── page.tsx           # Redirects to /dashboard
│   └── globals.css        # Tailwind + CSS variables
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── users/             # User-specific components
│   ├── layout/            # Shell, sidebar, header
│   ├── billing/
│   ├── docs/
│   ├── help-desk/
│   ├── organizations/
│   ├── support/
│   └── system/
├── lib/
│   ├── actions/           # Server Actions
│   │   ├── users.ts       # User CRUD + search + impersonation
│   │   ├── organizations.ts # Org search, trial management, metrics
│   │   ├── projects.ts    # Project search, toggle requirements, soft delete/restore
│   │   ├── api-keys.ts    # API key search, revoke
│   │   ├── org-settings.ts # Org settings CRUD (resolves clerk_org_id internally)
│   │   ├── integrations.ts # Integration search, disconnect, retry
│   │   ├── sandbox-leads.ts # Lead search, convert, delete, metrics
│   │   ├── build-queue.ts # Build search, assign, metrics
│   │   ├── lathe-audit.ts # Lathe audit log search
│   │   ├── test-cases.ts  # Project test case queries (read-only)
│   │   ├── test-runs.ts   # Project test run queries (read-only)
│   │   ├── billing.ts     # MRR, trial metrics, invoices, coupons
│   │   ├── api-usage.ts   # Daily API call metrics
│   │   ├── feature-flags.ts
│   │   ├── announcements.ts
│   │   ├── support-tickets.ts # Full ticket queue, assignment, analytics
│   │   ├── support-tickets-my.ts
│   │   ├── support-tickets-seeding.ts
│   │   ├── system-health.ts
│   │   ├── error-logs.ts
│   │   ├── audit-export.ts
│   │   ├── impersonation.ts
│   │   └── setup-admin.ts
│   ├── audit/
│   │   └── logger.ts      # logAdminAction() + getAuditLogs()
│   ├── clerk/
│   │   └── admin-check.ts # isCurrentUserAdmin()
│   ├── supabase/
│   │   └── admin.ts       # supabaseAdmin client
│   └── utils.ts           # cn() for Tailwind
├── types/
│   └── admin.ts           # All TypeScript types
├── content/docs/          # Markdown documentation
│   ├── getting-started.md
│   ├── user-management.md
│   └── runbooks/
├── test/
│   ├── setup.ts           # Vitest mocks
│   └── database/          # DB integration tests
└── middleware.ts          # Clerk auth + admin check
```

## Build and Development Commands

```bash
# Development (runs on port 3001)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run typecheck
```

> Note: there is no lint script. `next lint` was removed in Next.js 16 and
> ESLint is not configured in this repo. The verify gate is `npm run test`
> + `npm run typecheck`.

## Testing Commands

```bash
# Unit tests (Vitest)
npm run test
npm run test:watch
npm run test:coverage

# E2E tests (Playwright)
npm run e2e
npm run e2e:ui      # Interactive UI mode
npm run e2e:debug   # Debug mode
```

### Test Structure

| Type | Location | Framework |
|------|----------|-----------|
| Unit tests | `src/**/*.test.ts` | Vitest |
| Component tests | `src/components/**/__tests__/*.test.tsx` | Vitest + Testing Library |
| E2E tests | `e2e/*.spec.ts` | Playwright |
| DB integration | `src/test/database/*.test.ts` | Vitest + real Supabase |

### Playwright Configuration
- Tests run against Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Dev server auto-starts on port 3001
- Screenshots captured on failure

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase (Service Role for admin operations)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (for billing features)
STRIPE_SECRET_KEY=sk_...
```

## Authentication & Authorization

### Admin Access Control

1. **Middleware** (`src/middleware.ts`):
   - Protects all routes except `/sign-in`, `/sign-up`, `/unauthorized`, `/setup-admin`
   - Redirects non-authenticated users to sign-in
   - Redirects non-admin users to `/unauthorized`

2. **Admin Check**:
   - Users must have `isAdmin: true` in Clerk `publicMetadata`
   - Set via Clerk Dashboard or `/api/make-admin` route

3. **Server-side check**:
   ```typescript
   import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
   const isAdmin = await isCurrentUserAdmin();
   ```

### Granting Admin Access

```bash
# Via API route (requires CLERK_SECRET_KEY)
curl -X POST http://localhost:3001/api/make-admin \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_xxx"}'
```

Or manually in Clerk Dashboard → Users → Public Metadata → `{"isAdmin": true}`

## Database Schema

### Admin-Only Tables

Run `supabase/migrations/20260310_admin_console.sql` to create:

| Table | Purpose |
|-------|---------|
| `admin_audit_logs` | All admin actions with metadata |
| `feature_flags` | Feature flags with org/user targeting |
| `impersonation_tokens` | Secure user impersonation |
| `admin_announcements` | In-app announcements |
| `system_health_checks` | Service health monitoring |
| `admin_error_logs` | Aggregated error tracking |
| `api_usage_daily` | Daily API metrics |
| `system_settings` | Key-value config |

### Unified Schema Migration

Run `supabase/migrations/20260601_unify_shared_schemas.sql` to reconcile schema differences between admin console and lathe-studio for shared tables:
- `admin_announcements`: adds `link_url`, `link_text`
- `support_tickets`: adds `reference_code`, `first_response_at`, `closed_at`, `is_active`, `metadata`
- `support_ticket_comments`: adds `is_edited`, `edited_by`
- `support_sla_config`: adds `first_response_time`, `name`, business hours
- `support_team_members`: adds `skills`, notification preferences

### Operational Tables (Phase 4)

Run `supabase/migrations/20260615_phase4_operational_tables.sql`:

| Table | Purpose |
|-------|---------|
| `integration_connections` | Org/project integration status |
| `sandbox_leads` | Self-service signups and demo requests |
| `build_queue_items` | CI/CD build events |

### Lathe Audit Logs (Phase 5)

Run `supabase/migrations/20260620_lathe_audit_logs.sql`:

| Table | Purpose |
|-------|---------|
| `lathe_audit_logs` | App-level audit trail from lathe-studio |

### Shared Tables (from lathe-studio)

The admin console reads from these lathe-studio tables using service-role access:

| Table | Purpose |
|-------|---------|
| `organizations` | Orgs with `clerk_org_id`, trial state, Stripe IDs |
| `projects` | Projects with `requirements_enabled`, `deleted_at` |
| `users` | Lathe-studio user records with `clerk_user_id` |
| `project_members` | Project-level roles |
| `org_settings` | Per-org feature configuration |
| `api_keys` | Org/project-scoped API keys |
| `test_cases` | Test cases with steps, priority, status, version |
| `test_runs` | Test runs with environment, configuration, inheritance policy |
| `support_tickets` | Help desk tickets |
| `support_ticket_comments` | Ticket conversations |
| `support_ticket_links` | Linked resources on tickets (read-only) |
| `support_team_members` | Support team config |

### Key Database Functions

- `is_feature_enabled(flag_key, user_id, org_id)` — Check feature flag status
- `update_updated_at_column()` — Auto-update timestamp trigger
- `assign_run_sequence()` — Auto-assign run sequence numbers

## Server Actions Pattern

All data mutations use Server Actions in `src/lib/actions/`:

```typescript
"use server";

import { logAdminAction } from "@/lib/audit/logger";

export async function someAction(params: Params) {
  // 1. Perform the action
  // 2. Log the action
  await logAdminAction({
    action: "entity.operation",
    targetType: "entity",
    targetId: entityId,
    metadata: { /* context */ },
  });
}
```

**Always call `logAdminAction()` after write operations.**

## Audit Logging

Two audit trails:

### 1. Admin Actions (`admin_audit_logs`)
Every admin action is logged via `logAdminAction()`:

```typescript
import { logAdminAction } from "@/lib/audit/logger";

await logAdminAction({
  action: "user.update",           // dot notation: entity.action
  targetType: "user",              // user | organization | project | feature_flag | system | billing | announcement | support_ticket | api_key | integration | build_queue | lead | org_setting
  targetId: userId,                // Optional: affected entity ID
  targetName: userEmail,           // Optional: human-readable name
  metadata: { changedFields },     // Optional: additional context
});
```

### 2. Lathe App Events (`lathe_audit_logs`)
App-level events from lathe-studio itself:

```typescript
import { supabaseAdmin } from "@/lib/supabase/admin";

await supabaseAdmin.from("lathe_audit_logs").insert({
  entity_type: "test_case",
  entity_id: testCaseId,
  action: "updated",
  old_value: { status: "draft" },
  new_value: { status: "active" },
  performed_by: userId,
  performed_by_email: userEmail,
});
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use explicit return types on exported functions
- Types defined in `src/types/admin.ts`

### Imports
- Use `@/` path aliases (configured in `tsconfig.json`)
- Group imports: React/Next → External → Internal → Types

### Components
- Use shadcn/ui components from `@/components/ui`
- Client components marked with `"use client"`
- Server components by default

### Styling
- Dark mode only (`.dark` class on `<html>`)
- Use Tailwind classes with `cn()` utility for conditionals
- Color palette: slate backgrounds, amber accents

### Server Actions
- Mark with `"use server"`
- Always log actions via `logAdminAction()`
- Return plain objects (not classes)

## Security Considerations

1. **Service Role Key**: Never expose to client. Only use in:
   - Server Components
   - Server Actions
   - Route Handlers

2. **Admin Check**: Middleware blocks non-admins, but always verify in:
   - Server Actions (redundant check)
   - API routes

3. **Audit Logging**: All write operations must be logged

4. **Impersonation**: Tokens are SHA-256 hashed, single-use, expire after 1 hour

5. **CORS**: Not applicable (same-origin admin console)

## Common Tasks

### Adding a New Server Action

1. Create in `src/lib/actions/{feature}.ts`
2. Call `logAdminAction()` for writes
3. Use `src/types/admin.ts` for return types

### Adding a New Page

1. Create route in `src/app/{route}/page.tsx`
2. Add nav item in `src/components/layout/AdminSidebar.tsx`
3. Create loading state if needed

### Adding a Feature Flag

1. Insert into `feature_flags` table
2. Use `is_feature_enabled()` SQL function or
3. Check via `src/lib/actions/feature-flags.ts`

### Running Database Tests

1. Ensure Supabase is running
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
3. Remove `.skip` from test in `src/test/database/`
4. Run `npm run test`

## Troubleshooting

### "Missing SUPABASE_SERVICE_ROLE_KEY"
Check `.env.local` exists and contains the service role key (not anon key).

### "Not authorized" errors
Verify user has `isAdmin: true` in Clerk public metadata.

### E2E tests fail to start
Port 3001 may be in use. Kill existing dev server or use:
```bash
npx playwright test --reuse-existing-server
```

### Type errors after adding dependencies
Run `npm run typecheck` to verify. Check `tsconfig.json` paths if using `@/` aliases.

## External Documentation

- [Clerk Next.js docs](https://clerk.com/docs/quickstarts/nextjs)
- [shadcn/ui components](https://ui.shadcn.com/docs/components/accordion)
- [TanStack Table](https://tanstack.com/table/latest)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/)
