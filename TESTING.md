# Testing Guide

This document outlines the testing strategy and how to run tests for the Perpetual Test Admin Console.

## Test Structure

```
├── src/
│   ├── lib/actions/__tests__/      # Server action unit tests
│   ├── lib/audit/__tests__/        # Audit logging tests
│   ├── components/users/__tests__/ # Component tests
│   ├── app/api/impersonate/__tests__/# API route tests
│   └── test/
│       ├── setup.ts                # Test configuration & mocks
│       └── database/               # Database integration tests
├── e2e/                            # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── users.spec.ts
│   └── feature-flags.spec.ts
├── vitest.config.ts
├── playwright.config.ts
└── TESTING.md (this file)
```

## Test Types

### 1. Unit Tests (Vitest)

Test individual functions, components, and modules in isolation.

```bash
# Run all unit tests
npm run test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- src/lib/actions/__tests__/users.test.ts
```

### 2. Integration Tests (Vitest)

Test database operations and API routes with real dependencies.

```bash
# Run all tests including integration tests
npm run test

# Integration tests are marked with describe.skip()
# To run them, remove the .skip and ensure you have:
# - Running Supabase instance
# - Valid environment variables
```

### 3. E2E Tests (Playwright)

Test complete user flows in a real browser.

```bash
# Run all E2E tests
npm run e2e

# Run E2E tests with UI mode
npm run e2e:ui

# Run E2E tests in debug mode
npm run e2e:debug

# Run specific test file
npx playwright test e2e/users.spec.ts
```

## Test Coverage Areas

### Server Actions (`src/lib/actions/__tests__/`)

| File | Coverage |
|------|----------|
| `users.test.ts` | searchUsers, getUserById, updateUser, deleteUser, toggleUserAdmin |
| `feature-flags.test.ts` | CRUD operations, toggling, permission checks |
| `impersonation.test.ts` | Token generation, validation, history |

### Audit Logging (`src/lib/audit/__tests__/`)

| File | Coverage |
|------|----------|
| `logger.test.ts` | logAdminAction, getAuditLogs, filtering, pagination |

### Components (`src/components/**/__tests__/`)

| File | Coverage |
|------|----------|
| `UserTable.test.tsx` | Rendering, pagination, sorting, actions |
| `UserSearch.test.tsx` | Search input, form submission, clear |

### API Routes (`src/app/api/**/__tests__/`)

| File | Coverage |
|------|----------|
| `impersonate/route.test.ts` | Token validation, error handling |

### Database Integration (`src/test/database/`)

| File | Coverage |
|------|----------|
| `audit-logs.test.ts` | Insert, query, constraints, pagination |
| `feature-flags.test.ts` | CRUD, unique constraints, RPC function |
| `impersonation.test.ts` | Token lifecycle, expiration, uniqueness |

### E2E Tests (`e2e/`)

| File | Coverage |
|------|----------|
| `auth.spec.ts` | Sign-in, unauthorized, navigation, mobile sidebar |
| `users.spec.ts` | Search, filters, pagination, user detail, impersonation |
| `feature-flags.spec.ts` | Create, toggle, edit, delete flags |

## Running Tests

### Prerequisites

1. **Unit/Integration Tests:**
   ```bash
   npm install
   ```

2. **E2E Tests:**
   ```bash
   npm install
   npx playwright install
   ```

3. **Database Integration Tests:**
   - Running Supabase instance
   - Valid `.env.local` with service role key

### Environment Variables for Testing

Create `.env.test.local` for test-specific environment variables:

```
# Use test database
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# Mock Clerk for tests
CLERK_SECRET_KEY=test-secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=test-publishable
```

## Writing New Tests

### Server Action Test Template

```typescript
import { describe, it, expect, vi } from "vitest";
import { myAction } from "../my-actions";

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

describe("myAction", () => {
  it("should do something", async () => {
    const result = await myAction("arg");
    expect(result).toBeDefined();
  });

  it("should handle errors", async () => {
    await expect(myAction("invalid")).rejects.toThrow("Error message");
  });
});
```

### Component Test Template

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyComponent } from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interaction", () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/feature-path");
  });

  test("user can complete action", async ({ page }) => {
    await page.getByRole("button", { name: /action/i }).click();
    await expect(page.getByText("Success")).toBeVisible();
  });
});
```

## Mocking

### Clerk Authentication

Tests automatically use mocked Clerk from `src/test/setup.ts`:

```typescript
// Mock returns admin user by default
const { userId } = await auth(); // "user_test_123"
```

### Supabase

Tests use mocked Supabase client:

```typescript
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mock responses
vi.mocked(supabaseAdmin.from).mockReturnValue({
  select: vi.fn(() => Promise.resolve({ data: [], error: null })),
});
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test
      - run: npm run typecheck

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install
      - run: npm run e2e
```

## Best Practices

1. **Test Behavior, Not Implementation** - Test what the code does, not how it does it
2. **One Assertion Per Test** - Keep tests focused and readable
3. **Use Descriptive Names** - Test names should describe the behavior
4. **Mock External Dependencies** - Don't hit real APIs in unit tests
5. **Clean Up After Tests** - Remove test data from database
6. **Test Edge Cases** - Empty states, errors, boundaries
7. **Keep Tests Fast** - Slow tests discourage running them often

## Troubleshooting

### Tests fail with "Cannot find module"

Run `npm install` and ensure all dependencies are installed.

### E2E tests fail to start

Ensure the dev server is not already running on port 3001, or use:

```bash
npx playwright test --reuse-existing-server
```

### Database tests fail

Check that:
- Supabase is running
- Environment variables are set
- Database migrations are applied

### Coverage not generating

Install coverage provider:

```bash
npm install -D @vitest/coverage-v8
```
