"use client";

import { useState, useEffect } from "react";
import { Plus, ToggleLeft, Trash2, Edit, Globe, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

      {/* Flags Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : flags.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <ToggleLeft className="h-8 w-8 mx-auto mb-3 text-slate-700" />
          <p>No feature flags yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {flags.map((flag) => (
            <Card key={flag.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <ToggleLeft className="h-5 w-5 text-slate-500" />
                      <h3 className="font-semibold text-slate-100">{flag.name}</h3>
                      <code className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                        {flag.key}
                      </code>
                    </div>
                    {flag.description && (
                      <p className="mt-1 text-sm text-slate-400">{flag.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-400">
                          {flag.enabledGlobally ? "Global" : "Off"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-400">
                          {flag.enabledForOrgs.length} orgs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-400">
                          {flag.enabledForUsers.length} users
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-4">
                      <span className="text-sm text-slate-400">Global</span>
                      <Switch
                        checked={flag.enabledGlobally}
                        onCheckedChange={() => handleToggleGlobal(flag)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(flag)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(flag)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
