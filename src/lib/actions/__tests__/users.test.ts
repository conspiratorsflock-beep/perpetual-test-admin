import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserAdmin,
  getTotalUserCount,
} from "../users";
import { logAdminAction } from "@/lib/audit/logger";

// Mock audit logger
vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock Clerk
const mockUser = {
  id: "user_123",
  emailAddresses: [{ emailAddress: "test@example.com" }],
  firstName: "John",
  lastName: "Doe",
  imageUrl: "https://example.com/avatar.jpg",
  publicMetadata: { isAdmin: false },
  createdAt: Date.now(),
  lastSignInAt: Date.now(),
};

const mockClerkClient = {
  users: {
    getUserList: vi.fn(),
    getUser: vi.fn(),
    getOrganizationMembershipList: vi.fn(),
    updateUser: vi.fn(),
    updateUserMetadata: vi.fn(),
    deleteUser: vi.fn(),
  },
  organizations: {
    getOrganizationMembershipList: vi.fn(),
  },
};

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () => Promise.resolve(mockClerkClient),
}));

describe("User Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchUsers", () => {
    it("should return users with pagination", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [mockUser],
        totalCount: 1,
      });

      const result = await searchUsers({ limit: 10, offset: 0 });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.users[0].email).toBe("test@example.com");
    });

    it("should filter by query", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [mockUser],
        totalCount: 1,
      });

      await searchUsers({ query: "john", limit: 10, offset: 0 });

      expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith(
        expect.objectContaining({ query: "john" })
      );
    });

    it("should filter by admin status", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [{ ...mockUser, publicMetadata: { isAdmin: true } }],
        totalCount: 1,
      });

      const result = await searchUsers({ isAdmin: true });

      expect(result.users[0].isAdmin).toBe(true);
    });

    it("should handle empty results", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [],
        totalCount: 0,
      });

      const result = await searchUsers({});

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should filter by org membership when orgId provided", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [mockUser],
        totalCount: 1,
      });
      mockClerkClient.organizations.getOrganizationMembershipList.mockResolvedValue({
        data: [{ publicUserData: { userId: "user_123" } }],
      });

      const result = await searchUsers({ orgId: "org_123" });

      expect(result.users).toHaveLength(1);
    });
  });

  describe("getUserById", () => {
    it("should return user with details", async () => {
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
        data: [],
      });

      const result = await getUserById("user_123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user_123");
      expect(result?.email).toBe("test@example.com");
    });

    it("should return null for non-existent user", async () => {
      mockClerkClient.users.getUser.mockRejectedValue(new Error("Not found"));

      const result = await getUserById("nonexistent");

      expect(result).toBeNull();
    });

    it("should include organization memberships", async () => {
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
        data: [
          {
            organization: { id: "org_123", name: "Test Org" },
            role: "admin",
          },
        ],
      });

      const result = await getUserById("user_123");

      expect(result?.organizations).toHaveLength(1);
      expect(result?.organizations[0].name).toBe("Test Org");
    });
  });

  describe("updateUser", () => {
    it("should update user and log action", async () => {
      await updateUser("user_123", { firstName: "Jane" });

      expect(mockClerkClient.users.updateUser).toHaveBeenCalledWith("user_123", {
        firstName: "Jane",
        lastName: undefined,
        publicMetadata: undefined,
      });
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "user.update",
        targetType: "user",
        targetId: "user_123",
        metadata: { firstName: "Jane" },
      });
    });

    it("should update multiple fields", async () => {
      await updateUser("user_123", {
        firstName: "Jane",
        lastName: "Smith",
        publicMetadata: { customField: "value" },
      });

      // Name fields go through updateUser; publicMetadata uses updateUserMetadata (merge semantics)
      expect(mockClerkClient.users.updateUser).toHaveBeenCalledWith(
        "user_123",
        expect.objectContaining({
          firstName: "Jane",
          lastName: "Smith",
        })
      );
      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        "user_123",
        { publicMetadata: { customField: "value" } }
      );
    });
  });

  describe("deleteUser", () => {
    it("should delete user and log action", async () => {
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);

      await deleteUser("user_123");

      expect(mockClerkClient.users.deleteUser).toHaveBeenCalledWith("user_123");
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "user.delete",
        targetType: "user",
        targetId: "user_123",
        targetName: "test@example.com",
        metadata: { email: "test@example.com" },
      });
    });
  });

  describe("toggleUserAdmin", () => {
    it("should promote user to admin", async () => {
      await toggleUserAdmin("user_123", true);

      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        "user_123",
        { publicMetadata: { isAdmin: true } }
      );
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "user.promote_admin",
        targetType: "user",
        targetId: "user_123",
        metadata: { isAdmin: true },
      });
    });

    it("should revoke admin access", async () => {
      await toggleUserAdmin("user_123", false);

      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        "user_123",
        { publicMetadata: { isAdmin: false } }
      );
      expect(logAdminAction).toHaveBeenCalledWith({
        action: "user.revoke_admin",
        targetType: "user",
        targetId: "user_123",
        metadata: { isAdmin: false },
      });
    });
  });

  describe("getTotalUserCount", () => {
    it("should return total user count", async () => {
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [],
        totalCount: 150,
      });

      const result = await getTotalUserCount();

      expect(result).toBe(150);
    });
  });
});
