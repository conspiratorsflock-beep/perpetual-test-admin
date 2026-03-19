import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateImpersonationToken,
  validateImpersonationToken,
  getImpersonationHistory,
} from "../impersonation";
import { logAdminAction } from "@/lib/audit/logger";

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

const mockClerkClient = {
  users: {
    getUser: vi.fn(),
  },
};

let mockAuthUserId = "admin_123";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: mockAuthUserId,
    }),
  clerkClient: () => Promise.resolve(mockClerkClient),
}));

describe("Impersonation Actions", () => {
  const mockAdmin = {
    id: "admin_123",
    emailAddresses: [{ emailAddress: "admin@example.com" }],
  };

  const mockTargetUser = {
    id: "user_456",
    emailAddresses: [{ emailAddress: "user@example.com" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUserId = "admin_123";
    mockClerkClient.users.getUser.mockImplementation((id: string) => {
      if (id === "admin_123") return Promise.resolve(mockAdmin);
      if (id === "user_456") return Promise.resolve(mockTargetUser);
      return Promise.reject(new Error("Not found"));
    });
  });

  describe("generateImpersonationToken", () => {
    it("should generate token and store hash", async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ error: null })),
      });

      const token = await generateImpersonationToken("user_456");

      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes hex = 64 chars
      expect(mockSupabaseFrom).toHaveBeenCalledWith("impersonation_tokens");
    });

    it("should store token with correct metadata", async () => {
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      mockSupabaseFrom.mockReturnValue({ insert: mockInsert });

      await generateImpersonationToken("user_456");

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: "admin_123",
          admin_email: "admin@example.com",
          target_user_id: "user_456",
          target_user_email: "user@example.com",
          token_hash: expect.any(String),
          expires_at: expect.any(String),
        })
      );
    });

    it("should log token creation", async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ error: null })),
      });

      await generateImpersonationToken("user_456");

      expect(logAdminAction).toHaveBeenCalledWith({
        action: "impersonation.token_created",
        targetType: "user",
        targetId: "user_456",
        targetName: "user@example.com",
        metadata: expect.objectContaining({
          expiresAt: expect.any(String),
        }),
      });
    });

    it("should throw if not authenticated", async () => {
      mockAuthUserId = null as unknown as string;

      await expect(generateImpersonationToken("user_456")).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw on database error", async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() =>
          Promise.resolve({ error: { message: "DB Error" } })
        ),
      });

      await expect(generateImpersonationToken("user_456")).rejects.toThrow(
        "Failed to create impersonation token"
      );
    });
  });

  describe("validateImpersonationToken", () => {
    const futureExpiry = new Date(Date.now() + 1000 * 60 * 30).toISOString();

    /** Builds the atomic update chain: .update().eq().is().gt().select().maybeSingle() */
    const makeUpdateChain = (resolvedData: unknown) =>
      vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            gt: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: resolvedData, error: null })
                ),
              })),
            })),
          })),
        })),
      }));

    /** Builds the fallback select chain: .select().eq().maybeSingle() */
    const makeFallbackSelect = (resolvedData: unknown) =>
      vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: resolvedData, error: null })
          ),
        })),
      }));

    it("should validate valid token", async () => {
      mockSupabaseFrom.mockReturnValue({
        update: makeUpdateChain({
          target_user_id: "user_456",
          admin_id: "admin_123",
          expires_at: futureExpiry,
        }),
      });

      const result = await validateImpersonationToken("valid_token");

      expect(result.valid).toBe(true);
      expect(result.targetUserId).toBe("user_456");
      expect(result.adminId).toBe("admin_123");
    });

    it("should mark token as used after validation", async () => {
      const mockUpdate = makeUpdateChain({
        target_user_id: "user_456",
        admin_id: "admin_123",
        expires_at: futureExpiry,
      });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      await validateImpersonationToken("valid_token");

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should reject invalid token", async () => {
      // Update finds no matching rows; fallback select also finds nothing
      mockSupabaseFrom.mockReturnValue({
        update: makeUpdateChain(null),
        select: makeFallbackSelect(null),
      });

      const result = await validateImpersonationToken("invalid_token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token");
    });

    it("should reject already used token", async () => {
      // Update finds no rows (used_at IS NULL filter fails); fallback shows used_at set
      mockSupabaseFrom.mockReturnValue({
        update: makeUpdateChain(null),
        select: makeFallbackSelect({
          used_at: new Date().toISOString(),
          expires_at: futureExpiry,
        }),
      });

      const result = await validateImpersonationToken("used_token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token already used");
    });

    it("should reject expired token", async () => {
      // Update finds no rows (expires_at > now filter fails); fallback shows null used_at
      mockSupabaseFrom.mockReturnValue({
        update: makeUpdateChain(null),
        select: makeFallbackSelect({
          used_at: null,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        }),
      });

      const result = await validateImpersonationToken("expired_token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token expired");
    });
  });

  describe("getImpersonationHistory", () => {
    it("should return impersonation history", async () => {
      const mockHistory = [
        {
          id: "token_1",
          admin_email: "admin@example.com",
          target_user_email: "user@example.com",
          created_at: "2024-01-01T00:00:00Z",
          expires_at: "2024-01-01T00:30:00Z",
          used_at: "2024-01-01T00:05:00Z",
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve({ data: mockHistory, error: null })
            ),
          })),
        })),
      });

      const result = await getImpersonationHistory();

      expect(result).toHaveLength(1);
      expect(result[0].adminEmail).toBe("admin@example.com");
      expect(result[0].targetEmail).toBe("user@example.com");
    });

    it("should respect limit parameter", async () => {
      const mockLimit = vi.fn(() => Promise.resolve({ data: [], error: null }));
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({ limit: mockLimit })),
        })),
      });

      await getImpersonationHistory(25);

      expect(mockLimit).toHaveBeenCalledWith(25);
    });
  });
});
