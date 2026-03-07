import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

// Mock impersonation actions
const mockValidateImpersonationToken = vi.fn();

vi.mock("@/lib/actions/impersonation", () => ({
  validateImpersonationToken: (...args: unknown[]) =>
    mockValidateImpersonationToken(...args),
}));

describe("API: /api/impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const request = new NextRequest("http://localhost:3001/api/impersonate");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing token");
  });

  it("returns 401 for invalid token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: false,
      error: "Invalid token",
    });

    const request = new NextRequest(
      "http://localhost:3001/api/impersonate?token=invalid_token"
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid token");
  });

  it("returns 401 for expired token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: false,
      error: "Token expired",
    });

    const request = new NextRequest(
      "http://localhost:3001/api/impersonate?token=expired_token"
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Token expired");
  });

  it("returns 401 for already used token", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: false,
      error: "Token already used",
    });

    const request = new NextRequest(
      "http://localhost:3001/api/impersonate?token=used_token"
    );
    const response = await GET(request);

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

    const request = new NextRequest(
      "http://localhost:3001/api/impersonate?token=valid_token"
    );
    const response = await GET(request);

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

    const request = new NextRequest(
      "http://localhost:3001/api/impersonate?token=my_test_token"
    );
    await GET(request);

    expect(mockValidateImpersonationToken).toHaveBeenCalledWith("my_test_token");
  });

  it("handles URL-encoded tokens", async () => {
    mockValidateImpersonationToken.mockResolvedValue({
      valid: true,
      targetUserId: "user_123",
      adminId: "admin_456",
    });

    const token = "token+with/special=chars";
    const encodedToken = encodeURIComponent(token);
    const request = new NextRequest(
      `http://localhost:3001/api/impersonate?token=${encodedToken}`
    );
    await GET(request);

    // NextRequest automatically decodes query params
    expect(mockValidateImpersonationToken).toHaveBeenCalledWith(token);
  });
});
