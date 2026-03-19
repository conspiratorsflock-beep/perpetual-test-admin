# Perpetual Test Admin Console

Internal admin console for the Perpetual Test platform. Runs on port **3001** alongside the main app at `/Users/bryanjadrich/DEV/Perpetual Test/perpetual-test/`.

## Quick Reference

| Topic | File |
|-------|------|
| Architecture & project structure | [.claude/architecture.md](.claude/architecture.md) |
| Development & build commands | [.claude/development.md](.claude/development.md) |
| Testing strategy & templates | [.claude/testing.md](.claude/testing.md) |
| Code conventions & patterns | [.claude/conventions.md](.claude/conventions.md) |
| Database schema & migrations | [.claude/database.md](.claude/database.md) |
| Auth, security & impersonation | [.claude/security.md](.claude/security.md) |
| Help desk system | [.claude/help-desk.md](.claude/help-desk.md) |
| Incomplete features & orphaned code | [TODO.md](TODO.md) |

## Tech Stack (at a glance)

- **Framework**: Next.js 16, App Router, TypeScript 5.8
- **Styling**: Tailwind CSS 4.0, shadcn/ui (New York style, slate+amber, dark-only)
- **Auth**: Clerk (`@clerk/nextjs`) — admin gate via `publicMetadata.isAdmin`
- **Database**: Supabase with service-role client (bypasses RLS)
- **Tables/Forms**: TanStack Table v8, React Hook Form + Zod
- **State**: Zustand (sidebar), Recharts (charts)

## Critical Rules

1. **All write operations must call `logAdminAction()`** — see [conventions](.claude/conventions.md)
2. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client** — service-role client only in Server Components, Server Actions, and Route Handlers
3. **Always verify admin status in Server Actions and API routes** — middleware alone is not sufficient
4. **Dark mode only** — `class="dark"` is fixed on `<html>`; never add light-mode variants
