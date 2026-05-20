"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProjectMembersWithRoles,
  updateProjectMemberCustomRole,
  removeProjectMember,
} from "@/lib/actions/project-members-admin";
import { getCustomRoles } from "@/lib/actions/custom-roles";
import type { ProjectMemberWithRole, CustomRole } from "@/types/admin";
import { Users, Trash2 } from "lucide-react";

interface ProjectMembersTabProps {
  projectId: string;
  orgId: string;
}

export default function ProjectMembersTab({ projectId, orgId }: ProjectMembersTabProps) {
  const [members, setMembers] = useState<ProjectMemberWithRole[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [membersData, rolesData] = await Promise.all([
          getProjectMembersWithRoles(projectId),
          getCustomRoles(orgId),
        ]);
        setMembers(membersData);
        setCustomRoles(rolesData);
      } catch (error) {
        console.error("Failed to load project members:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId, orgId]);

  const handleRoleChange = async (clerkUserId: string, customRoleId: string) => {
    try {
      await updateProjectMemberCustomRole(projectId, clerkUserId, customRoleId || null);
      // Refresh members
      const updated = await getProjectMembersWithRoles(projectId);
      setMembers(updated);
    } catch (error) {
      console.error("Failed to update member role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role.");
    }
  };

  const handleRemoveMember = async (clerkUserId: string, name: string | null) => {
    if (!confirm(`Remove ${name || "this member"} from the project?`)) return;
    try {
      await removeProjectMember(projectId, clerkUserId);
      setMembers((prev) => prev.filter((m) => m.id !== clerkUserId));
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert(error instanceof Error ? error.message : "Failed to remove member.");
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-8">
          <div className="text-center text-slate-400 text-sm">Loading members...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">No members found.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/users/${member.id}`}
                    className="text-sm font-medium text-slate-200 hover:text-amber-400"
                  >
                    {member.name || member.email}
                  </Link>
                  <p className="text-xs text-slate-500">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                      {member.role}
                    </Badge>
                    {member.assignedViaGroupId && (
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                        via {member.assignedViaGroupName || "group"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={member.customRoleId ?? "_legacy_"}
                    onValueChange={(value) => handleRoleChange(member.id, value === "_legacy_" ? "" : value)}
                  >
                    <SelectTrigger className="w-40 bg-slate-950 border-slate-700 text-slate-100 text-xs h-8">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      <SelectItem value="_legacy_" className="text-slate-300">
                        Legacy: {member.role}
                      </SelectItem>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id} className="text-slate-300">
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400"
                    onClick={() => handleRemoveMember(member.id, member.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
