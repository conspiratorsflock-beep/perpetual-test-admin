"use client";

import React from "react";
import {
  ClerkProvider as ClerkProviderReal,
  UserButton as UserButtonReal,
  SignedIn as SignedInReal,
  SignedOut as SignedOutReal,
  useUser as useUserReal,
  useAuth as useAuthReal,
} from "@clerk/nextjs";

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
    return <ClerkProviderReal>{children}</ClerkProviderReal>;
  }
  return <>{children}</>;
}

// ============================================
// UserButton
// ============================================
export function UserButton(props: Record<string, unknown>) {
  if (!DEV_BYPASS) {
    return <UserButtonReal {...props} />;
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
    return <SignedInReal>{children}</SignedInReal>;
  }
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  if (!DEV_BYPASS) {
    return <SignedOutReal>{children}</SignedOutReal>;
  }
  return null;
}

// ============================================
// useUser
// ============================================
// DEV_BYPASS is a build-time constant, so the hook-call branch is render-stable.
export function useUser() {
  if (!DEV_BYPASS) {
    return useUserReal();
  }
  return {
    isLoaded: true,
    isSignedIn: true,
    user: mockUser as unknown as ReturnType<typeof useUserReal>["user"],
  };
}

// ============================================
// useAuth
// ============================================
// DEV_BYPASS is a build-time constant, so the hook-call branch is render-stable.
export function useAuth() {
  if (!DEV_BYPASS) {
    return useAuthReal();
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
