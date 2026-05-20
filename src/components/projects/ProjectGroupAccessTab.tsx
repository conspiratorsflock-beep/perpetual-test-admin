"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProjectGroups,
  assignGroupToProject,
  removeGroupFromProject,
  getUserGroups,
} from "@/lib/actions/user-groups";
import { getCustomRoles } from "@/lib/actions/custom-roles";
import type { ProjectGroupAccess, UserGroup, CustomRole } from "@/types/admin";
import { UserCircle, Plus, Trash2, AlertTriangle } from "lucide-react";

interface ProjectGroupAccessTabProps {
  projectId: string;
  orgId: string;
}

export default function ProjectGroupAccessTab({ projectId, orgId }: ProjectGroupAccessTabProps) {
  const [projectGroups, setProjectGroups] = useState<ProjectGroupAccess[]>([]);
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [pgData, groupsData, rolesData] = await Promise.all([
          getProjectGroups(projectId),
          getUserGroups(orgId),
          getCustomRoles(orgId),
        ]);
        setProjectGroups(pgData);
        // Filter out groups already assigned
        const assignedGroupIds = new Set(pgData.map((g) => g.groupId));
        setAvailableGroups(groupsData.filter((g) => !assignedGroupIds.has(g.id)));
        setCustomRoles(rolesData);
      } catch (error) {
        console.error("Failed to load group access:", error);
        setActionError("Failed to load group access.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId, orgId]);

  const handleAssign = async () => {
    setActionError(null);
    if (!selectedGroupId || !selectedRoleId) {
      setActionError("Please select a group and a role.");
      return;
    }

    try {
      await assignGroupToProject(projectId, selectedGroupId, selectedRoleId);
      const updated = await getProjectGroups(projectId);
      setProjectGroups(updated);
      // Remove assigned group from available list
      setAvailableGroups((prev) => prev.filter((g) => g.id !== selectedGroupId));
      setSelectedGroupId("");
      setSelectedRoleId("");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to assign group:", error);
      setActionError(error instanceof Error ? error.message : "Failed to assign group.");
    }
  };

  const handleRemove = async (groupId: string, groupName?: string) => {
    if (!confirm(`Remove group "${groupName || "this group"}" from project?`)) return;
    try {
      await removeGroupFromProject(projectId, groupId);
      setProjectGroups((prev) => prev.filter((g) => g.groupId !== groupId));
      // Add back to available groups if needed
      // We'll refetch on next dialog open or just let it be
    } catch (error) {
      console.error("Failed to remove group:", error);
      alert(error instanceof Error ? error.message : "Failed to remove group.");
    }
  };

  const openAssignDialog = async () => {
    setActionError(null);
    setSelectedGroupId("");
    setSelectedRoleId("");
    // Refresh available groups
    try {
      const groupsData = await getUserGroups(orgId);
      const assignedGroupIds = new Set(projectGroups.map((g) => g.groupId));
      setAvailableGroups(groupsData.filter((g) => !assignedGroupIds.has(g.id)));
    } catch (error) {
      console.error("Failed to refresh groups:", error);
    }
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-8">
          <div className="text-center text-slate-400 text-sm">Loading group access...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Group Access
          </CardTitle>
          <Button
            size="sm"
            onClick={openAssignDialog}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            <Plus className="mr-1 h-3 w-3" />
            Assign Group
          </Button>
        </CardHeader>
        <CardContent>
          {projectGroups.length === 0 ? (
            <p className="text-sm text-slate-500">No groups assigned to this project.</p>
          ) : (
            <div className="space-y-3">
              {projectGroups.map((pg) => (
                <div
                  key={pg.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-200">{pg.groupName || "Unknown Group"}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                        Role: {pg.roleName || "Unknown"}
                      </Badge>
                      <span className="text-xs text-slate-600">
                        Assigned {format(new Date(pg.assignedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400"
                    onClick={() => handleRemove(pg.groupId, pg.groupName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Assign Group to Project</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a user group and a role to assign them to this project.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {actionError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id} className="text-slate-300">
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                  {customRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id} className="text-slate-300">
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              Assign Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
