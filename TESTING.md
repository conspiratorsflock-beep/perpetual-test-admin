# Testing Guide

This document reflects the current testing setup for the Lathe Studio Admin Console. If a claim here conflicts with the repo, the repo wins.

## Quick verify gate

```bash
npm run test        # 29 test files, ~330 passed, ~47 skipped
npm run typecheck   # tsc --noEmit
```

There is **no lint step**: Next 16 dropped `next lint` and ESLint is not configured (no `.eslintrc*`, no `eslint.config.*`, no `lint` script in `package.json`).

## Test structure

```
src/
  lib/actions/__tests__/          # Server action unit tests
  lib/audit/__tests__/             # Audit logging tests
  lib/shared/__tests__/            # Shared utility tests
  components/**/__tests__/         # Component tests
  app/api/impersonate/__tests__/   # API route tests
  test/
    setup.ts                       # Shared Vitest mocks
    database/                      # DB integration tests (deliberately skipped)
e2e/                               # Playwright E2E tests
```

## Shared mocks (`src/test/setup.ts`)

The global setup file provides baseline mocks so individual tests only override what matters:

- **Clerk** — admin-by-default auth (`user_test_123` with `isAdmin: true`).
- **Supabase** — a chainable mock that covers `.eq()`, `.in()`, `.maybeSingle()`, `.order()`, `.range()`, etc. Local per-file mocks replace `supabaseAdmin.from` when the default chain is insufficient.
- **Browser APIs** — `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `navigator.clipboard`.

Override shared mocks per file as needed:

```typescript
const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));
```

## House style for server-action tests

Use `src/lib/actions/__tests__/impersonation.test.ts` or `organizations.test.ts` as templates:

- **Per-table mock routing** — `mockSupabaseFrom` returns a different chain for `"organizations"`, `"projects"`, `"api_keys"`, etc., when a single action touches multiple tables.
- **Non-admin gates** — assert the function throws `"Unauthorized"` and that no DB/Stripe call was made.
- **Byte-exact wire values** — assert column names and payload shapes (`deleted_at`, `revoked_at`, `monthly_quota_override`, etc.), not just "update was called".
- **Audit logging** — every write asserts `logAdminAction` with the exact action string from the source; reads assert it is not called.
- **Dates** — use `vi.setSystemTime` and pinned dates when the source calls `new Date().toISOString()`.

## The dev-auth trap

Components do not import `@clerk/nextjs` directly; they import through the wrapper at `@/lib/dev-auth/client` or `@/lib/dev-auth/server`. In tests, mock the wrapper — not Clerk itself. See `src/components/help-desk/__tests__/TicketDetail.test.tsx`:

```typescript
vi.mock("@/lib/dev-auth/client", () => ({
  useUser: () => ({ ... }),
}));
```

Mocking `@clerk/nextjs` in these tests will silently fail because the component never imports it.

## DB integration tests policy

Files under `src/test/database/` are wrapped in `describe.skip()` on purpose. They read and write the **live shared Supabase database**. Do not unskip them in CI or on a shared clone.

A migration file being present in `supabase/migrations/` does not mean it has been applied to the live DB. Schema claims are verified against the live database out-of-band (reviewer via Supabase MCP), not by local tests.

## E2E tests (Playwright)

Commands from `package.json`:

```bash
npm run e2e         # playwright test
npm run e2e:ui      # playwright test --ui
npm run e2e:debug   # playwright test --debug
```

Prerequisites:

```bash
npx playwright install
```

The dev server is expected on port `3001` (see `playwright.config.ts` and `package.json`). If you already have a dev server running, use:

```bash
npx playwright test --reuse-existing-server
```

## Writing new tests

1. Re-run `npm run test` and `npm run typecheck` after every commit.
2. If a shared mock is wrong for your case, override it locally; do not edit `src/test/setup.ts` unless the baseline is genuinely broken.
3. Keep the source file under test unchanged unless the plan explicitly authorizes edits. Suspected bugs are reported and locked by tests, not silently fixed.
