"use client";

import React from "react";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

const mockUser = {
  id: "dev_admin",
  emailAddresses: [{ emailAddress: "admin@localhost" }],
  primaryEmailAddress: { emailAddress: "admin@localhost" },
  firstName: "Dev",
  lastName: "Admin",
  fullName: "Dev Admin",
  imageUrl: "",
  publicMetadata: { isAdmin: true },
};

// ============================================
// ClerkProvider
// ============================================
export function ClerkProvider({ children }: { children: React.ReactNode }) {
  if (!DEV_BYPASS) {
    const { ClerkProvider: Real } = require("@clerk/nextjs");
    return <Real>{children}</Real>;
  }
  return <>{children}</>;
}

// ============================================
// UserButton
// ============================================
export function UserButton(props: Record<string, unknown>) {
  if (!DEV_BYPASS) {
    const { UserButton: Real } = require("@clerk/nextjs");
    return <Real {...props} />;
  }
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-medium">
        DA
      </div>
      <span className="hidden sm:inline">Dev Admin</span>
    </div>
  );
}

// ============================================
// SignedIn / SignedOut
// ============================================
export function SignedIn({ children }: { children: React.ReactNode }) {
  if (!DEV_BYPASS) {
    const { SignedIn: Real } = require("@clerk/nextjs");
    return <Real>{children}</Real>;
  }
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  if (!DEV_BYPASS) {
    const { SignedOut: Real } = require("@clerk/nextjs");
    return <Real>{children}</Real>;
  }
  return null;
}

// ============================================
// useUser
// ============================================
export function useUser() {
  if (!DEV_BYPASS) {
    const { useUser: real } = require("@clerk/nextjs");
    return real();
  }
  return {
    isLoaded: true,
    isSignedIn: true,
    user: mockUser as unknown as ReturnType<typeof import("@clerk/nextjs").useUser>["user"],
  };
}

// ============================================
// useAuth
// ============================================
export function useAuth() {
  if (!DEV_BYPASS) {
    const { useAuth: real } = require("@clerk/nextjs");
    return real();
  }
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "dev_admin",
    sessionId: "dev_session",
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: () => true,
    signOut: async () => {},
    getToken: async () => "dev_token",
  };
}
