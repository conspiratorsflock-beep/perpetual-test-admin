import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportAuditLogsToCSV, exportAuditLogsToJSON } from "../audit-export";
import { getAuditLogs } from "@/lib/audit/logger";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  getAuditLogs: vi.fn(),
}));

describe("Audit Export Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exportAuditLogsToCSV", () => {
    it("should export logs to CSV format", async () => {
      const mockLogs = [
        {
          id: "log_1",
          adminUserId: "user_123",
          adminEmail: "admin@example.com",
          action: "user.create",
          targetType: "user" as const,
          targetId: "user_456",
          targetName: "John Doe",
          metadata: { email: "john@example.com" },
          createdAt: "2024-03-15T10:00:00Z",
        },
        {
          id: "log_2",
          adminUserId: "user_123",
          adminEmail: "admin@example.com",
          action: "org.update",
          targetType: "organization" as const,
          targetId: "org_789",
          targetName: null,
          metadata: {},
          createdAt: "2024-03-15T11:00:00Z",
        },
      ];

      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: mockLogs,
        count: 2,
      });

      const result = await exportAuditLogsToCSV();

      // Check header
      expect(result).toContain(
        "ID,Timestamp,Admin Email,Action,Target Type,Target ID,Target Name,Metadata"
      );

      // Check data rows
      expect(result).toContain("log_1");
      expect(result).toContain("admin@example.com");
      expect(result).toContain("user.create");
      expect(result).toContain("John Doe");

      // Check that targetName is quoted properly
      expect(result).toContain('"John Doe"');

      // Check JSON metadata is included
      expect(result).toContain('email');
      expect(result).toContain('john@example.com');
    });

    it("should handle empty logs", async () => {
      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: [],
        count: 0,
      });

      const result = await exportAuditLogsToCSV();

      expect(result).toContain("ID,Timestamp,Admin Email,Action");
      // Header row only when no data
      expect(result.split("\n").filter(Boolean)).toHaveLength(1);
    });

    it("should apply filters", async () => {
      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: [],
        count: 0,
      });

      await exportAuditLogsToCSV({
        startDate: "2024-03-01",
        endDate: "2024-03-15",
        targetType: "user",
        adminId: "user_123",
        action: "user.create",
      });

      expect(getAuditLogs).toHaveBeenCalledWith({
        limit: 10000,
        startDate: "2024-03-01",
        endDate: "2024-03-15",
        targetType: "user",
        adminId: "user_123",
        action: "user.create",
      });
    });

    it("should escape quotes in targetName", async () => {
      const mockLogs = [
        {
          id: "log_1",
          adminUserId: "user_123",
          adminEmail: "admin@example.com",
          action: "user.create",
          targetType: "user" as const,
          targetId: "user_456",
          targetName: 'John "The Admin" Doe',
          metadata: {},
          createdAt: "2024-03-15T10:00:00Z",
        },
      ];

      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: mockLogs,
        count: 1,
      });

      const result = await exportAuditLogsToCSV();

      expect(result).toContain('"John ""The Admin"" Doe"');
    });
  });

  describe("exportAuditLogsToJSON", () => {
    it("should export logs to JSON format", async () => {
      const mockLogs = [
        {
          id: "log_1",
          adminUserId: "user_123",
          adminEmail: "admin@example.com",
          action: "user.create",
          targetType: "user" as const,
          targetId: "user_456",
          targetName: "John Doe",
          metadata: { email: "john@example.com" },
          createdAt: "2024-03-15T10:00:00Z",
        },
      ];

      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: mockLogs,
        count: 1,
      });

      const result = await exportAuditLogsToJSON();

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("log_1");
      expect(parsed[0].action).toBe("user.create");
    });

    it("should format JSON with indentation", async () => {
      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: [],
        count: 0,
      });

      const result = await exportAuditLogsToJSON();

      expect(result).toBe("[]");
    });

    it("should apply filters", async () => {
      vi.mocked(getAuditLogs).mockResolvedValue({
        logs: [],
        count: 0,
      });

      await exportAuditLogsToJSON({
        targetType: "organization",
      });

      expect(getAuditLogs).toHaveBeenCalledWith({
        limit: 10000,
        targetType: "organization",
        startDate: undefined,
        endDate: undefined,
        adminId: undefined,
        action: undefined,
      });
    });
  });
});
