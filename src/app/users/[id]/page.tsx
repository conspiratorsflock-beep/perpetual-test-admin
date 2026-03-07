"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  Shield,
  User,
  Clock,
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImpersonateButton } from "@/components/users/ImpersonateButton";
import { getUserById, toggleUserAdmin, deleteUser } from "@/lib/actions/users";
import { getAuditLogsForTarget } from "@/lib/audit/logger";
import type { UserWithDetails, AuditLog } from "@/types/admin";

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserWithDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [userData, logs] = await Promise.all([
          getUserById(userId),
          getAuditLogsForTarget("user", userId, 20),
        ]);
        setUser(userData);
        setAuditLogs(logs);
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [userId]);

  const handleToggleAdmin = async () => {
    if (!user) return;
    const makeAdmin = !user.isAdmin;
    if (!confirm(`Are you sure you want to ${makeAdmin ? "grant" : "revoke"} admin access?`)) {
      return;
    }
    try {
      await toggleUserAdmin(userId, makeAdmin);
      setUser({ ...user, isAdmin: makeAdmin });
    } catch (error) {
      console.error("Failed to toggle admin:", error);
      alert("Failed to update user.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) {
      return;
    }
    try {
      await deleteUser(userId);
      window.location.href = "/users";
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-slate-400">User not found</div>
        <Link href="/users">
          <Button variant="outline" className="border-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/users">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.imageUrl} alt={displayName} />
            <AvatarFallback className="bg-slate-800 text-slate-400 text-lg">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-100">{displayName}</h1>
              {user.isAdmin && (
                <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ImpersonateButton userId={user.id} userEmail={user.email} />
          <Button
            variant="outline"
            onClick={handleToggleAdmin}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            {user.isAdmin ? "Revoke Admin" : "Make Admin"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-800 bg-red-950/30 text-red-400 hover:bg-red-950/50 hover:text-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="organizations"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            Organizations
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-400">User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">User ID</p>
                    <p className="text-sm text-slate-300 font-mono">{user.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm text-slate-300">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="text-sm text-slate-300">
                      {format(new Date(user.createdAt), "PPP")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Last Sign In</p>
                    <p className="text-sm text-slate-300">
                      {user.lastSignInAt
                        ? format(new Date(user.lastSignInAt), "PPP p")
                        : "Never"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-400">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Organizations</span>
                  <span className="text-sm font-medium text-slate-100">
                    {user.organizations.length}
                  </span>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Account Status</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    Active
                  </Badge>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Role</span>
                  <span className="text-sm text-slate-100">
                    {user.isAdmin ? "Administrator" : "Standard User"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Organization Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              {user.organizations.length === 0 ? (
                <p className="text-sm text-slate-500">Not a member of any organizations.</p>
              ) : (
                <div className="space-y-3">
                  {user.organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <div>
                          <Link
                            href={`/organizations/${org.id}`}
                            className="text-sm font-medium text-slate-200 hover:text-amber-400"
                          >
                            {org.name}
                          </Link>
                          <p className="text-xs text-slate-500">Role: {org.role}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-slate-700 text-slate-400">
                        {org.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950"
                    >
                      <Activity className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300">
                          <span className="font-medium">{log.action}</span>
                          {log.targetName && (
                            <span className="text-slate-500"> on {log.targetName}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          by {log.adminEmail} • {format(new Date(log.createdAt), "PP p")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
