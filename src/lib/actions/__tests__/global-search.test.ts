import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalSearch } from "../global-search";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { clerkClient } from "@clerk/nextjs/server";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
const mockIsCurrentUserAdmin = vi.mocked(isCurrentUserAdmin);
const mockClerkClient = vi.mocked(clerkClient);

function makeClerkUser(id: string, email: string, firstName?: string, lastName?: string) {
  return {
    id,
    emailAddresses: [{ emailAddress: email }],
    firstName: firstName ?? null,
    lastName: lastName ?? null,
  };
}

function makeSearchChain(rows: unknown[]) {
  const result = { data: rows, error: null };
  const thenableLimit = {
    limit: vi.fn(() => ({
      then: vi.fn((resolve: unknown) =>
        Promise.resolve(result).then(resolve as (value: typeof result) => unknown)
      ),
    })),
  };
  return {
    select: vi.fn(() => ({
      or: vi.fn(() => ({
        ...thenableLimit,
        order: vi.fn(() => thenableLimit),
      })),
      ilike: vi.fn(() => ({
        is: vi.fn(() => thenableLimit),
      })),
      order: vi.fn(() => thenableLimit),
    })),
  };
}

describe("Global Search — guard behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCurrentUserAdmin.mockResolvedValue(false);
  });

  it("returns empty buckets when caller is not admin", async () => {
    const result = await globalSearch("foo");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(mockClerkClient).not.toHaveBeenCalled();
    expect(result).toEqual({ users: [], organizations: [], projects: [], tickets: [] });
  });
});

describe("Global Search — admin queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(() =>
          Promise.resolve({
            data: [makeClerkUser("u1", "a@example.com", "Ada", "Lovelace")],
          })
        ),
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  });

  it("returns empty buckets for empty query without calling backends", async () => {
    const result = await globalSearch("   ");
    expect(mockClerkClient).not.toHaveBeenCalled();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ users: [], organizations: [], projects: [], tickets: [] });
  });

  it("queries Clerk users and all Supabase tables with ilike patterns", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "organizations") return makeSearchChain([{ id: "o1", name: "Acme", slug: "acme" }]);
      if (table === "projects") return makeSearchChain([{ id: "p1", name: "Alpha", organizations: { name: "Acme" } }]);
      if (table === "support_tickets") return makeSearchChain([{ id: "t1", ticket_number: 42, subject: "Alpha bug", user_email: "a@example.com" }]);
      return {};
    });

    const result = await globalSearch("alpha");

    expect(mockClerkClient).toHaveBeenCalled();
    expect(result.users).toEqual([{ id: "u1", email: "a@example.com", name: "Ada Lovelace", type: "user" }]);
    expect(result.organizations).toEqual([{ id: "o1", name: "Acme", slug: "acme", type: "organization" }]);
    expect(result.projects).toEqual([{ id: "p1", name: "Alpha", orgName: "Acme", type: "project" }]);
    expect(result.tickets).toEqual([{ id: "t1", ticketNumber: 42, subject: "Alpha bug", userEmail: "a@example.com", type: "ticket" }]);
  });

  it("gracefully handles Clerk errors", async () => {
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(() => Promise.reject(new Error("Clerk down"))),
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "organizations") return makeSearchChain([]);
      if (table === "projects") return makeSearchChain([]);
      if (table === "support_tickets") return makeSearchChain([]);
      return {};
    });

    const result = await globalSearch("x");
    expect(result.users).toEqual([]);
    expect(result.organizations).toEqual([]);
  });
});
