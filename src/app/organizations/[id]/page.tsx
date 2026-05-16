"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Building2, Users, CreditCard, Activity, Calendar, Lock, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOrganizationById, changeTrialState, extendTrial } from "@/lib/actions/organizations";
import { getAuditLogsForTarget } from "@/lib/audit/logger";
import type { OrganizationWithDetails, AuditLog, TrialLockState } from "@/types/admin";

const trialStateColors: Record<TrialLockState, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  soft_locked: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hard_locked: "bg-red-500/20 text-red-400 border-red-500/30",
  paid: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const trialStateLabels: Record<TrialLockState, string> = {
  active: "Trial Active",
  soft_locked: "Soft Locked",
  hard_locked: "Hard Locked",
  paid: "Paid",
};

const trialActions: { state: TrialLockState; label: string }[] = [
  { state: "active", label: "Activate Trial" },
  { state: "soft_locked", label: "Soft Lock" },
  { state: "hard_locked", label: "Hard Lock" },
  { state: "paid", label: "Mark Paid" },
];

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [org, setOrg] = useState<OrganizationWithDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [orgData, logs] = await Promise.all([
          getOrganizationById(orgId),
          getAuditLogsForTarget("organization", orgId, 20),
        ]);
        setOrg(orgData);
        setAuditLogs(logs);
      } catch (error) {
        console.error("Failed to load organization:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [orgId]);

  const handleTrialChange = async (newState: TrialLockState) => {
    if (!org || newState === org.trialLockState) return;
    if (!confirm(`Change trial state to "${trialStateLabels[newState]}"?`)) return;

    try {
      await changeTrialState(orgId, newState, "Manual trial state change by admin");
      setOrg({ ...org, trialLockState: newState });
    } catch (error) {
      console.error("Failed to change trial state:", error);
      alert("Failed to update trial state.");
    }
  };

  const handleExtendTrial = async () => {
    if (!org) return;
    if (!confirm("Extend trial by 30 days?")) return;

    try {
      await extendTrial(orgId, 30);
      // Reload to get updated trial_ends_at
      const updated = await getOrganizationById(orgId);
      setOrg(updated);
    } catch (error) {
      console.error("Failed to extend trial:", error);
      alert("Failed to extend trial.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-slate-400">Organization not found</div>
        <Link href="/organizations">
          <Button variant="outline" className="border-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organizations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/organizations">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Organizations
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-100">{org.name}</h1>
              <Badge variant="outline" className={trialStateColors[org.trialLockState]}>
                {trialStateLabels[org.trialLockState]}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">{org.slug}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Members
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Projects
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Billing
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-400">Organization Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Organization ID</p>
                    <p className="text-sm text-slate-300 font-mono">{org.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Members</p>
                    <p className="text-sm text-slate-300">{org.memberCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Current MRR</p>
                    <p className="text-sm text-slate-300">${org.mrr.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-400">Trial Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {trialActions.map((action) => (
                    <Button
                      key={action.state}
                      variant={org.trialLockState === action.state ? "default" : "outline"}
                      onClick={() => handleTrialChange(action.state)}
                      className={
                        org.trialLockState === action.state
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={handleExtendTrial}
                  className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Extend Trial (+30 days)
                </Button>
                {org.trialEndsAt && (
                  <p className="text-xs text-slate-500">
                    Trial ends: {format(new Date(org.trialEndsAt), "PPP")}
                    {org.trialExtensionUsed && " (extension used)"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {org.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-800 text-slate-400 text-xs">
                          {member.firstName?.[0] || member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/users/${member.id}`}
                          className="text-sm font-medium text-slate-200 hover:text-amber-400"
                        >
                          {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email}
                        </Link>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {org.projects.length > 0 ? (
                <div className="space-y-3">
                  {org.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">{project.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{project.id}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        Created {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No projects found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Billing Information</CardTitle>
            </CardHeader>
            <CardContent>
              {org.subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge
                      variant={org.subscription.status === "active" ? "default" : "outline"}
                      className={
                        org.subscription.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "border-slate-700 text-slate-400"
                      }
                    >
                      {org.subscription.status}
                    </Badge>
                  </div>
                  <Separator className="bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Current Period</span>
                    <span className="text-sm text-slate-300">
                      {format(new Date(org.subscription.currentPeriodStart), "MMM d")} -{" "}
                      {format(new Date(org.subscription.currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </div>
                  <Separator className="bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">API Calls (30d)</span>
                    <span className="text-sm text-slate-300">{org.usage.apiCallsThisMonth.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No subscription found. Organization is in trial.</p>
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
