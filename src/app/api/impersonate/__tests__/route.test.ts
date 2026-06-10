import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockValidateImpersonationToken = vi.fn();

vi.mock("@/lib/dev-auth/server", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/actions/impersonation", () => ({
  validateImpersonationToken: (...args: unknown[]) =>
    mockValidateImpersonationToken(...args),
}));

const adminAuth = {
  userId: "admin_1",
  sessionClaims: { publicMetadata: { isAdmin: true } },
};

function makePostRequest(body?: unknown): NextRequest {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost:3001/api/impersonate", init);
}

describe("API: /api/impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminAuth);
  });

  it("returns 400 Invalid request body when no body is provided", async () => {
    const request = new NextRequest("http://localhost:3001/api/impersonate", {
      method: "POST",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 Missing token when body has no token", async () => {
    const response = await POST(makePostRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing token");
  });

  it("returns 401 Invalid token for invalid token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: false,
      error: "Invalid token",
    });

    const response = await POST(makePostRequest({ token: "invalid_token" }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid token");
  });

  it("returns 401 Token expired for expired token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: false,
      error: "Token expired",
    });

    const response = await POST(makePostRequest({ token: "expired_token" }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Token expired");
  });

  it("returns 401 Token already used for already-used token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: false,
      error: "Token already used",
    });

    const response = await POST(makePostRequest({ token: "used_token" }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Token already used");
  });

  it("returns 200 with user info for valid token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: true,
      targetUserId: "user_123",
      adminId: "admin_456",
    });

    const response = await POST(makePostRequest({ token: "valid_token" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.targetUserId).toBe("user_123");
    expect(body.adminId).toBe("admin_456");
  });

  it("calls validateImpersonationToken with correct token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: true,
      targetUserId: "user_123",
      adminId: "admin_456",
    });

    await POST(makePostRequest({ token: "my_test_token" }));

    expect(mockValidateImpersonationToken).toHaveBeenCalledWith("my_test_token");
  });

  it("handles URL-encoded tokens", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: true,
      targetUserId: "user_123",
      adminId: "admin_456",
    });

    const token = "token+with/special=chars";
    await POST(makePostRequest({ token }));

    expect(mockValidateImpersonationToken).toHaveBeenCalledWith(token);
  });
});
