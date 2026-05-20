"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  getGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
} from "@/lib/actions/user-groups";
import type { UserGroup, GroupMembership } from "@/types/admin";
import { Users, Plus, Pencil, Trash2, AlertTriangle, UserPlus, UserMinus } from "lucide-react";

interface OrgGroupsSettingsProps {
  orgId: string;
}

export default function OrgGroupsSettings({ orgId }: OrgGroupsSettingsProps) {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  // Members dialog state
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMembership[]>([]);
  const [newMemberId, setNewMemberId] = useState("");

  useEffect(() => {
    async function loadGroups() {
      setIsLoading(true);
      try {
        const data = await getUserGroups(orgId);
        setGroups(data);
      } catch (error) {
        console.error("Failed to load groups:", error);
        setActionError("Failed to load groups.");
      } finally {
        setIsLoading(false);
      }
    }
    loadGroups();
  }, [orgId]);

  const openCreateDialog = () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setActionError(null);
    setGroupDialogOpen(true);
  };

  const openEditDialog = (group: UserGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description ?? "");
    setActionError(null);
    setGroupDialogOpen(true);
  };

  const openMembersDialog = async (group: UserGroup) => {
    setSelectedGroup(group);
    setNewMemberId("");
    setActionError(null);
    setMembersDialogOpen(true);
    try {
      const members = await getGroupMembers(group.id);
      setGroupMembers(members);
    } catch (error) {
      console.error("Failed to load group members:", error);
    }
  };

  const handleSaveGroup = async () => {
    setActionError(null);
    if (!groupName.trim()) {
      setActionError("Group name is required.");
      return;
    }

    try {
      if (editingGroup) {
        await updateUserGroup(editingGroup.id, {
          name: groupName.trim(),
          description: groupDescription.trim() || null,
        });
        setGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroup.id
              ? { ...g, name: groupName.trim(), description: groupDescription.trim() || null }
              : g
          )
        );
      } else {
        const newGroup = await createUserGroup(orgId, groupName.trim(), groupDescription.trim() || null);
        setGroups((prev) => [...prev, newGroup]);
      }
      setGroupDialogOpen(false);
    } catch (error) {
      console.error("Failed to save group:", error);
      setActionError(error instanceof Error ? error.message : "Failed to save group.");
    }
  };

  const handleDeleteGroup = async (group: UserGroup) => {
    if (!confirm(`Delete group "${group.name}"?`)) return;
    try {
      await deleteUserGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert(error instanceof Error ? error.message : "Failed to delete group.");
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberId.trim()) return;
    setActionError(null);
    try {
      await addUserToGroup(selectedGroup.id, newMemberId.trim());
      const members = await getGroupMembers(selectedGroup.id);
      setGroupMembers(members);
      setNewMemberId("");
      // Update member count in groups list
      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroup.id ? { ...g, memberCount: (g.memberCount || 0) + 1 } : g))
      );
    } catch (error) {
      console.error("Failed to add member:", error);
      setActionError(error instanceof Error ? error.message : "Failed to add member.");
    }
  };

  const handleRemoveMember = async (clerkUserId: string) => {
    if (!selectedGroup) return;
    try {
      await removeUserFromGroup(selectedGroup.id, clerkUserId);
      setGroupMembers((prev) => prev.filter((m) => m.clerkUserId !== clerkUserId));
      // Update member count in groups list
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id ? { ...g, memberCount: Math.max(0, (g.memberCount || 0) - 1) } : g
        )
      );
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert(error instanceof Error ? error.message : "Failed to remove member.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-slate-400 text-sm">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Groups
          </CardTitle>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            <Plus className="mr-1 h-3 w-3" />
            Create Group
          </Button>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500">No user groups yet.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-200">{group.name}</span>
                    {group.description && (
                      <p className="text-xs text-slate-500 mt-1">{group.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                        {group.memberCount ?? 0} members
                      </Badge>
                      <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                        {group.projectCount ?? 0} projects
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-slate-500 hover:text-slate-300"
                      onClick={() => openMembersDialog(group)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Members
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-amber-400"
                      onClick={() => openEditDialog(group)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-400"
                      onClick={() => handleDeleteGroup(group)}
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

      {/* Create/Edit Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create User Group"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingGroup ? "Update the group name and description." : "Create a new user group for bulk assignment."}
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
              <Label htmlFor="group-name" className="text-slate-300">
                Name
              </Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., QA Team"
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description" className="text-slate-300">
                Description
              </Label>
              <Textarea
                id="group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-950 border-slate-700 text-slate-100"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGroupDialogOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveGroup} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Members — {selectedGroup?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add or remove members from this group.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {actionError}
            </div>
          )}

          <div className="space-y-4">
            {/* Add member */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-member-id" className="text-slate-300">
                  Clerk User ID
                </Label>
                <Input
                  id="new-member-id"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  placeholder="user_xxxxxxxxxx"
                  className="bg-slate-950 border-slate-700 text-slate-100"
                />
              </div>
              <Button
                onClick={handleAddMember}
                disabled={!newMemberId.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Members list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {groupMembers.length === 0 ? (
                <p className="text-sm text-slate-500">No members in this group.</p>
              ) : (
                groupMembers.map((member) => (
                  <div
                    key={member.clerkUserId}
                    className="flex items-center justify-between p-2 rounded-md border border-slate-800 bg-slate-950"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200">
                        {member.userName || member.userEmail || member.clerkUserId}
                      </p>
                      {(member.userName || member.userEmail) && (
                        <p className="text-xs text-slate-500 font-mono truncate">{member.clerkUserId}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-red-400 flex-shrink-0"
                      onClick={() => handleRemoveMember(member.clerkUserId)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMembersDialogOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
