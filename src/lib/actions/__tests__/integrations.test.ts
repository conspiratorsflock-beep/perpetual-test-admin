import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchIntegrations, disconnectIntegration, getIntegrationMetrics } from "../integrations";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/clerk/admin-check";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(true)),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
const mockLogAdminAction = vi.mocked(logAdminAction);

function makeCicdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    project_id: "p1",
    provider: "github",
    external_id: "ext1",
    error_count: 0,
    last_used_at: "2024-06-01T10:00:00Z",
    last_event_at: null,
    error_message: null,
    created_at: "2024-06-01T09:00:00Z",
    projects: { name: "Project A", org_id: "o1", organizations: { name: "Acme" } },
    ...overrides,
  };
}

function makeBaseChains(dataMap: Record<string, unknown[]>) {
  return (table: string) => {
    const rows = dataMap[table] ?? [];
    return {
      select: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    };
  };
}

function makeCountChain(count: number | null, error: unknown = null) {
  return {
    select: vi.fn(() => Promise.resolve({ count, error })),
  };
}

describe("Integrations — non-admin gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {
      throw new Error("Unauthorized");
    });
  });

  it.each([
    ["searchIntegrations", () => searchIntegrations()],
    ["disconnectIntegration", () => disconnectIntegration("i1", "slack")],
    ["getIntegrationMetrics", () => getIntegrationMetrics()],
  ] as const)("%s rejects before Supabase call", async (_name, action) => {
    await expect(action()).rejects.toThrow("Unauthorized");
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});

describe("Integrations — searchIntegrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("maps all connection types and applies filters/pagination", async () => {
    mockSupabaseFrom.mockImplementation(
      makeBaseChains({
        cicd_connections: [makeCicdRow()],
        slack_connections: [
          { id: "s1", org_id: "o1", status: "connected", channel_name: "#alerts", last_used_at: "2024-06-01T08:00:00Z", error_message: null, created_at: "2024-06-01T07:00:00Z", organizations: { name: "Acme" } },
        ],
        teams_connections: [],
        jira_connections: [
          { id: "j1", org_id: "o2", status: "error", jira_site_name: "jira.example.com", last_synced_at: null, error_message: "auth", created_at: "2024-06-01T06:00:00Z" },
        ],
        azure_devops_connections: [],
      })
    );

    const result = await searchIntegrations({ limit: 2, offset: 0 });

    expect(result.total).toBe(3);
    expect(result.integrations).toHaveLength(2);
    const ids = result.integrations.map((i) => i.id);
    expect(ids).toContain("c1");
  });

  it("filters by provider and status and orgId", async () => {
    mockSupabaseFrom.mockImplementation(
      makeBaseChains({
        cicd_connections: [],
        slack_connections: [
          { id: "s1", org_id: "o1", status: "connected", channel_name: "#alerts", last_used_at: null, error_message: null, created_at: "2024-06-01T07:00:00Z", organizations: { name: "Acme" } },
          { id: "s2", org_id: "o2", status: "error", channel_name: "#ops", last_used_at: null, error_message: "boom", created_at: "2024-06-01T07:00:00Z", organizations: { name: "Other" } },
        ],
        teams_connections: [],
        jira_connections: [],
        azure_devops_connections: [],
      })
    );

    const result = await searchIntegrations({ provider: "slack", status: "error", orgId: "o2" });
    expect(result.integrations).toHaveLength(1);
    expect(result.integrations[0]).toMatchObject({ id: "s2", provider: "slack", status: "error", orgId: "o2" });
  });

  it("derives cicd status from error_count", async () => {
    mockSupabaseFrom.mockImplementation(
      makeBaseChains({
        cicd_connections: [makeCicdRow({ error_count: 3 })],
        slack_connections: [],
        teams_connections: [],
        jira_connections: [],
        azure_devops_connections: [],
      })
    );

    const result = await searchIntegrations({ provider: "github" });
    expect(result.integrations[0].status).toBe("error");
  });
});

describe("Integrations — disconnectIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("deletes connection and logs for each type", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "slack_connections") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
      return {};
    });

    await disconnectIntegration("i1", "slack");

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "integration.disconnect",
      targetType: "integration",
      targetId: "i1",
      metadata: { type: "slack" },
    });
  });

  it("throws for unknown type", async () => {
    await expect(disconnectIntegration("i1", "unknown" as "slack")).rejects.toThrow("Unknown integration type: unknown");
  });

  it("throws on DB error and does not log", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "jira_connections") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: { message: "boom" } })),
          })),
        };
      }
      return {};
    });

    await expect(disconnectIntegration("i1", "jira")).rejects.toThrow("Failed to disconnect: boom");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});

describe("Integrations — getIntegrationMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockImplementation(async () => {});
  });

  it("returns totals by type, by status, and error count", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "cicd_connections") {
        return makeCountChain(2); // count query
      }
      if (table === "slack_connections") return makeCountChain(1);
      if (table === "teams_connections") return makeCountChain(0);
      if (table === "jira_connections") return makeCountChain(1);
      if (table === "azure_devops_connections") return makeCountChain(0);
      return {};
    });

    const result = await getIntegrationMetrics();
    expect(result.total).toBe(4);
    expect(result.byType).toMatchObject({ cicd: 2, slack: 1, teams: 0, jira: 1, azure_devops: 0 });
  });
});
