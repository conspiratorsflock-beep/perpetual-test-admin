"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/dev-auth/client";
import { getActiveAnnouncements } from "@/lib/shared/get-announcements";
import type { AdminAnnouncement } from "@/types/admin";

export default function AnnouncementsDebugPage() {
  const { user, isLoaded } = useUser();
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    setNow(new Date().toISOString());
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setIsLoading(true);
    try {
      const data = await getActiveAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }

  // Get user info
  const userTier = user?.publicMetadata?.subscriptionTier as string | undefined;
  const orgId = user?.publicMetadata?.orgId as string | undefined;

  // Filter announcements as the user would see them
  const visibleToUser = announcements.filter((a) => {
    // Check tier
    if (a.tier && a.tier !== "all" && userTier) {
      if (a.tier !== userTier) return false;
    }
    // Check org
    if (a.orgId && orgId) {
      if (a.orgId !== orgId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold text-slate-100">Announcements Debug</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">Current Time</h2>
        <p className="text-slate-200 font-mono text-sm">{now}</p>
        <p className="text-slate-500 text-xs mt-1">Local: {new Date().toLocaleString()}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">User Info</h2>
        {!isLoaded ? (
          <p className="text-slate-500">Loading user...</p>
        ) : user ? (
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">User ID:</span> <span className="text-slate-300 font-mono">{user.id}</span></p>
            <p><span className="text-slate-500">Email:</span> <span className="text-slate-300">{user.primaryEmailAddress?.emailAddress}</span></p>
            <p><span className="text-slate-500">Tier:</span> <span className="text-slate-300">{userTier || "(not set)"}</span></p>
            <p><span className="text-slate-500">Org ID:</span> <span className="text-slate-300 font-mono">{orgId || "(not set)"}</span></p>
          </div>
        ) : (
          <p className="text-red-400">Not logged in</p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">
          Active Announcements from DB ({announcements.length})
        </h2>
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : announcements.length === 0 ? (
          <p className="text-amber-400">No active announcements found in database</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="border border-slate-800 rounded p-3 bg-slate-950">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${new Date(a.startsAt) <= new Date() && (!a.endsAt || new Date(a.endsAt) > new Date()) ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-slate-200 font-medium">{a.message.slice(0, 80)}{a.message.length > 80 ? "..." : ""}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{a.style}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <p>ID: <span className="font-mono">{a.id}</span></p>
                  <p>Starts: <span className="font-mono">{a.startsAt}</span></p>
                  <p>Ends: <span className="font-mono">{a.endsAt || "never"}</span></p>
                  <p>Tier: {a.tier || "all"}</p>
                  <p>Org: {a.orgId || "(all)"}</p>

                  {/* Check why it might not be showing */}
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <p className="text-amber-400">Visibility Check:</p>
                    <ul className="ml-2 space-y-0.5">
                      <li className={new Date(a.startsAt) <= new Date() ? "text-emerald-400" : "text-red-400"}>
                        {new Date(a.startsAt) <= new Date() ? "✓" : "✗"} Started ({new Date(a.startsAt).toLocaleString()})
                      </li>
                      {a.endsAt && (
                        <li className={new Date(a.endsAt) > new Date() ? "text-emerald-400" : "text-red-400"}>
                          {new Date(a.endsAt) > new Date() ? "✓" : "✗"} Not ended yet
                        </li>
                      )}
                      <li className={!a.tier || a.tier === "all" || (userTier && a.tier === userTier) ? "text-emerald-400" : "text-red-400"}>
                        {!a.tier || a.tier === "all" || (userTier && a.tier === userTier) ? "✓" : "✗"} Tier match (user: {userTier || "none"}, target: {a.tier || "all"})
                      </li>
                      <li className={!a.orgId || (orgId && a.orgId === orgId) ? "text-emerald-400" : "text-red-400"}>
                        {!a.orgId || (orgId && a.orgId === orgId) ? "✓" : "✗"} Org match (user: {orgId?.slice(0, 8) || "none"}..., target: {a.orgId?.slice(0, 8) || "all"}...)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-2">
          Visible to Current User ({visibleToUser.length})
        </h2>
        {visibleToUser.length === 0 ? (
          <p className="text-amber-400">No announcements would be visible to this user</p>
        ) : (
          <div className="space-y-2">
            {visibleToUser.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300">{a.message.slice(0, 60)}{a.message.length > 60 ? "..." : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={loadAnnouncements}
        className="px-4 py-2 bg-amber-500 text-slate-950 rounded font-medium hover:bg-amber-600"
      >
        Refresh
      </button>
    </div>
  );
}
