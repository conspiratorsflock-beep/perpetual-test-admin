"use client";

import { useState, useEffect } from "react";
import { Plus, ToggleLeft, ToggleRight, Trash2, Edit, Globe, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlagGlobal,
} from "@/lib/actions/feature-flags";
import type { FeatureFlag } from "@/types/admin";

interface FlagRowProps {
  flag: FeatureFlag;
  onToggle: (flag: FeatureFlag) => void;
  onEdit: (flag: FeatureFlag) => void;
  onDelete: (flag: FeatureFlag) => void;
}

function FlagRow({ flag, onToggle, onEdit, onDelete }: FlagRowProps) {
  return (
    <TableRow className="border-slate-800 hover:bg-slate-800/50">
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-medium text-slate-100">{flag.name}</span>
            <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 mt-1 w-fit">
              {flag.key}
            </code>
          </div>
        </div>
        {flag.description && (
          <p className="mt-1 text-sm text-slate-400">{flag.description}</p>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-slate-400">{flag.enabledForOrgs.length} orgs</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <span className="text-slate-400">{flag.enabledForUsers.length} users</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(flag)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(flag)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={flag.enabledGlobally}
            onCheckedChange={() => onToggle(flag)}
            className="ml-2"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

interface FlagTableProps {
  title: string;
  icon: React.ReactNode;
  flags: FeatureFlag[];
  emptyMessage: string;
  onToggle: (flag: FeatureFlag) => void;
  onEdit: (flag: FeatureFlag) => void;
  onDelete: (flag: FeatureFlag) => void;
}

function FlagTable({ title, icon, flags, emptyMessage, onToggle, onEdit, onDelete }: FlagTableProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="secondary" className="bg-slate-800 text-slate-300">
            {flags.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {flags.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Feature Flag</TableHead>
                <TableHead className="text-slate-400">Targeting</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <FlagRow
                  key={flag.id}
                  flag={flag}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  // Form state
  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setIsLoading(true);
    try {
      const data = await getFeatureFlags();
      setFlags(data);
    } catch (error) {
      console.error("Failed to load flags:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreate = async () => {
    try {
      await createFeatureFlag({
        key: formKey,
        name: formName,
        description: formDescription,
      });
      setIsCreateOpen(false);
      resetForm();
      loadFlags();
    } catch (error) {
      console.error("Failed to create flag:", error);
      alert("Failed to create feature flag");
    }
  };

  const handleUpdate = async () => {
    if (!editingFlag) return;
    try {
      await updateFeatureFlag(editingFlag.id, {
        name: formName,
        description: formDescription,
      });
      setEditingFlag(null);
      resetForm();
      loadFlags();
    } catch (error) {
      console.error("Failed to update flag:", error);
      alert("Failed to update feature flag");
    }
  };

  const handleToggleGlobal = async (flag: FeatureFlag) => {
    try {
      await toggleFeatureFlagGlobal(flag.id, !flag.enabledGlobally);
      loadFlags();
    } catch (error) {
      console.error("Failed to toggle flag:", error);
    }
  };

  const handleDelete = async (flag: FeatureFlag) => {
    if (!confirm(`Delete feature flag "${flag.name}"? This cannot be undone.`)) return;
    try {
      await deleteFeatureFlag(flag.id);
      loadFlags();
    } catch (error) {
      console.error("Failed to delete flag:", error);
      alert("Failed to delete feature flag");
    }
  };

  const resetForm = () => {
    setFormKey("");
    setFormName("");
    setFormDescription("");
  };

  const openEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormKey(flag.key);
    setFormName(flag.name);
    setFormDescription(flag.description || "");
  };

  // Split flags into active and inactive
  const activeFlags = flags.filter((flag) => flag.enabledGlobally);
  const inactiveFlags = flags.filter((flag) => !flag.enabledGlobally);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Feature Flags</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage feature flags for controlled rollouts and beta access.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              <Plus className="mr-2 h-4 w-4" />
              New Flag
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
              <DialogDescription className="text-slate-400">
                Add a new feature flag for controlled rollout.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="e.g., new_dashboard"
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., New Dashboard UI"
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What does this flag control?"
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : flags.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <ToggleLeft className="h-8 w-8 mx-auto mb-3 text-slate-700" />
          <p>No feature flags yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Flags Table */}
          <FlagTable
            title="Active Flags"
            icon={<ToggleRight className="h-5 w-5 text-emerald-400" />}
            flags={activeFlags}
            emptyMessage="No active flags. Toggle a flag to activate it."
            onToggle={handleToggleGlobal}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* Inactive Flags Table */}
          <FlagTable
            title="Inactive Flags"
            icon={<ToggleLeft className="h-5 w-5 text-slate-500" />}
            flags={inactiveFlags}
            emptyMessage="No inactive flags."
            onToggle={handleToggleGlobal}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFlag} onOpenChange={() => setEditingFlag(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key (read-only)</Label>
              <Input value={formKey} disabled className="bg-slate-950 border-slate-800" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingFlag(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
