import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
    forEach: vi.fn(),
    entries: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    toString: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === "x-forwarded-for") return "127.0.0.1";
        if (key === "user-agent") return "Test-Agent";
        return null;
      }),
    }),
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn() }),
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  auth: () =>
    Promise.resolve({
      userId: "user_test_123",
      sessionClaims: { publicMetadata: { isAdmin: true } },
    }),
  clerkClient: () =>
    Promise.resolve({
      users: {
        getUser: vi.fn(),
        getUserList: vi.fn(),
        updateUser: vi.fn(),
        updateUserMetadata: vi.fn(),
        deleteUser: vi.fn(),
      },
      organizations: {
        getOrganization: vi.fn(),
        getOrganizationList: vi.fn(),
        getOrganizationMembershipList: vi.fn(),
      },
    }),
  SignIn: () => null,
  SignUp: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Clerk server components
vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: "user_test_123",
      sessionClaims: { publicMetadata: { isAdmin: true } },
      redirectToSignIn: vi.fn(),
    }),
  clerkClient: () =>
    Promise.resolve({
      users: {
        getUser: vi.fn(),
        getUserList: vi.fn(() =>
          Promise.resolve({ data: [], totalCount: 0 })
        ),
        updateUser: vi.fn(),
        updateUserMetadata: vi.fn(),
        deleteUser: vi.fn(),
      },
      organizations: {
        getOrganization: vi.fn(),
        getOrganizationList: vi.fn(() =>
          Promise.resolve({ data: [], totalCount: 0 })
        ),
        getOrganizationMembershipList: vi.fn(() =>
          Promise.resolve({ data: [] })
        ),
      },
    }),
}));

// Mock Supabase
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => Promise.resolve({ error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: false, error: null })),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// Mock clipboard
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve("")),
  },
});
