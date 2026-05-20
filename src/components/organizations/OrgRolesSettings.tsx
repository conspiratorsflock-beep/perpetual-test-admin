"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  getPermissionsCatalog,
  getCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
} from "@/lib/actions/custom-roles";
import type { Permission, CustomRole } from "@/types/admin";
import { Shield, Plus, Pencil, Trash2, AlertTriangle, Check } from "lucide-react";

interface OrgRolesSettingsProps {
  orgId: string;
}

const systemRoleDescriptions: Record<string, string> = {
  viewer: "Can view all content and reports.",
  tester: "Can create and update test content, manage sections, requirements, and tags.",
  admin: "Can manage projects, members, integrations, and organization settings.",
  owner: "Full access including restricted permissions like billing and ownership transfer.",
};

export default function OrgRolesSettings({ orgId }: OrgRolesSettingsProps) {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [rolesData, permsData] = await Promise.all([
          getCustomRoles(orgId),
          getPermissionsCatalog(),
        ]);
        setRoles(rolesData);
        setPermissions(permsData);
      } catch (error) {
        console.error("Failed to load roles:", error);
        setActionError("Failed to load roles.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [orgId]);

  const permissionsByResource = useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = grouped.get(p.resource) || [];
      list.push(p);
      grouped.set(p.resource, list);
    }
    return grouped;
  }, [permissions]);

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  const openCreateDialog = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissionIds([]);
    setActionError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (role: CustomRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description ?? "");
    setSelectedPermissionIds(role.permissionIds ?? []);
    setActionError(null);
    setDialogOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  };

  const handleSaveRole = async () => {
    setActionError(null);
    if (!roleName.trim()) {
      setActionError("Role name is required.");
      return;
    }

    try {
      if (editingRole) {
        await updateCustomRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDescription.trim() || null,
          permissionIds: selectedPermissionIds,
        });
        setRoles((prev) =>
          prev.map((r) =>
            r.id === editingRole.id
              ? { ...r, name: roleName.trim(), description: roleDescription.trim() || null, permissionIds: selectedPermissionIds }
              : r
          )
        );
      } else {
        const newRole = await createCustomRole(orgId, roleName.trim(), roleDescription.trim() || null, selectedPermissionIds);
        setRoles((prev) => [...prev, newRole]);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save role:", error);
      setActionError(error instanceof Error ? error.message : "Failed to save role.");
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    if (!confirm(`Delete custom role "${role.name}"?`)) return;
    try {
      await deleteCustomRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch (error) {
      console.error("Failed to delete role:", error);
      alert(error instanceof Error ? error.message : "Failed to delete role.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-slate-400 text-sm">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Roles */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            System Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-start justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{role.name}</span>
                    <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                      System
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {systemRoleDescriptions[role.systemRoleKey || ""] || role.description}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {role.permissionIds?.length ?? role.permissions?.length ?? "—"} permissions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-400">Custom Roles</CardTitle>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            <Plus className="mr-1 h-3 w-3" />
            Create Role
          </Button>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <p className="text-sm text-slate-500">No custom roles yet.</p>
          ) : (
            <div className="space-y-3">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-200">{role.name}</span>
                    {role.description && (
                      <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {role.permissionIds?.length ?? role.permissions?.length ?? "—"} permissions
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-amber-400"
                      onClick={() => openEditDialog(role)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-400"
                      onClick={() => handleDeleteRole(role)}
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

      {/* Create/Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Custom Role"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingRole
                ? "Update the role name, description, and permissions."
                : "Create a new custom role by selecting permissions."}
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
              <Label htmlFor="role-name" className="text-slate-300">
                Name
              </Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., QA Lead"
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description" className="text-slate-300">
                Description
              </Label>
              <Textarea
                id="role-description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-950 border-slate-700 text-slate-100"
                rows={2}
              />
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-3">
              <Label className="text-slate-300">Permissions</Label>
              <p className="text-xs text-slate-500">
                Restricted permissions can only be assigned by org owners (shown disabled).
              </p>

              <div className="space-y-4">
                {Array.from(permissionsByResource.entries()).map(([resource, perms]) => (
                  <div key={resource} className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {resource}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((perm) => {
                        const isSelected = selectedPermissionIds.includes(perm.id);
                        const isRestricted = perm.isRestricted;
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            disabled={isRestricted}
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors ${
                              isRestricted
                                ? "border-slate-800 bg-slate-950/50 text-slate-600 cursor-not-allowed opacity-60"
                                : isSelected
                                ? "border-amber-500/30 bg-amber-500/10 text-slate-200"
                                : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                            }`}
                            title={perm.description ?? `${perm.resource}:${perm.action}`}
                          >
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center ${
                                isRestricted
                                  ? "border-slate-700 bg-slate-800"
                                  : isSelected
                                  ? "border-amber-500 bg-amber-500"
                                  : "border-slate-600"
                              }`}
                            >
                              {isSelected && !isRestricted && <Check className="h-3 w-3 text-slate-950" />}
                            </div>
                            <span className="capitalize">{perm.action}</span>
                            {isRestricted && (
                              <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] ml-auto">
                                Restricted
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
            <Button
              onClick={handleSaveRole}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
