# Perpetual Test Admin Console — Agent Guide

## Project Overview

This is an internal admin console for the Perpetual Test platform. It provides comprehensive tools for managing users, organizations, billing, feature flags, system health, and audit logging.

**Key Characteristics:**
- Dark-mode only admin interface (slate + amber accent theme)
- Server-side rendering with Next.js App Router
- All admin actions are audited and logged
- Impersonation capabilities for user support
- Service-role access to Supabase (bypasses RLS)

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
│   │   ├── impersonate/   # User impersonation tokens
│   │   └── make-admin/    # Admin promotion utility
│   ├── billing/           # Billing dashboard
│   ├── dashboard/         # Main dashboard
│   ├── docs/[[...slug]]/  # Documentation pages
│   ├── organizations/     # Org management
│   ├── projects/          # Project overview
│   ├── support/           # Support tools
│   │   ├── activity/      # Audit logs
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
│   ├── organizations/
│   ├── support/
│   └── system/
├── lib/
│   ├── actions/           # Server Actions
│   │   ├── users.ts       # User CRUD + search
│   │   ├── organizations.ts
│   │   ├── feature-flags.ts
│   │   ├── impersonation.ts
│   │   └── setup-admin.ts
│   ├── audit/
│   │   └── logger.ts      # logAdminAction() helper
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

# Linting
npm run lint
```

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

Run `supabase/migrations/20260310_admin_console.sql` to create:

| Table | Purpose |
|-------|---------|
| `admin_audit_logs` | All admin actions with metadata |
| `feature_flags` | Feature flags with org/user targeting |
| `impersonation_tokens` | Secure user impersonation |
| `admin_announcements` | In-app announcements |
| `system_health_checks` | Service health monitoring |
| `admin_error_logs` | Aggregated error tracking |

### Key Database Functions

- `is_feature_enabled(flag_key, user_id, org_id)` — Check feature flag status
- `update_updated_at_column()` — Auto-update timestamp trigger

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

Every admin action is logged to `admin_audit_logs`:

```typescript
import { logAdminAction } from "@/lib/audit/logger";

await logAdminAction({
  action: "user.update",           // dot notation: entity.action
  targetType: "user",              // user | organization | project | feature_flag | system | billing | announcement
  targetId: userId,                // Optional: affected entity ID
  targetName: userEmail,           // Optional: human-readable name
  metadata: { changedFields },     // Optional: additional context
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
2. Add tests in `src/lib/actions/__tests__/{feature}.test.ts`
3. Call `logAdminAction()` for writes
4. Use `src/types/admin.ts` for return types

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
