"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Key, Building2, FolderKanban, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchApiKeys, revokeApiKey, updateApiKeyQuota } from "@/lib/actions/api-keys";
import type { ApiKey } from "@/types/admin";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [quotaValue, setQuotaValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadKeys() {
      setIsLoading(true);
      try {
        const result = await searchApiKeys({ limit: 100 });
        setKeys(result.keys);
      } catch (error) {
        console.error("Failed to load API keys:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadKeys();
  }, []);

  const handleRevoke = async (keyId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await revokeApiKey(keyId);
      setKeys(keys.filter((k) => k.id !== keyId));
      setActionSuccess("API key revoked successfully.");
      setRevokeDialogOpen(false);
    } catch (error) {
      console.error("Failed to revoke key:", error);
      setActionError("Failed to revoke API key.");
    } finally {
      setRevokingKeyId(null);
    }
  };

  const openQuotaDialog = (key: ApiKey) => {
    setEditingKey(key);
    setQuotaValue(key.monthlyQuotaOverride?.toString() ?? "");
    setActionError(null);
    setQuotaDialogOpen(true);
  };

  const handleSaveQuota = async () => {
    if (!editingKey) return;
    setActionError(null);
    const quota = quotaValue.trim() === "" ? null : parseInt(quotaValue, 10);
    if (quota !== null && (isNaN(quota) || quota < 0)) {
      setActionError("Please enter a valid non-negative number.");
      return;
    }
    try {
      await updateApiKeyQuota(editingKey.id, quota);
      setKeys((prev) =>
        prev.map((k) => (k.id === editingKey.id ? { ...k, monthlyQuotaOverride: quota } : k))
      );
      setActionSuccess("Quota updated successfully.");
      setQuotaDialogOpen(false);
    } catch (error) {
      console.error("Failed to update quota:", error);
      setActionError(error instanceof Error ? error.message : "Failed to update quota.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">API Keys</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage organization and project-scoped API keys.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-400">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">All API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Prefix</TableHead>
                  <TableHead className="text-slate-400">Scope</TableHead>
                  <TableHead className="text-slate-400">Scopes</TableHead>
                  <TableHead className="text-slate-400">Quota</TableHead>
                  <TableHead className="text-slate-400">Usage</TableHead>
                  <TableHead className="text-slate-400">Last Used</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400 w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : keys.length > 0 ? (
                  keys.map((key) => (
                    <TableRow key={key.id} className="border-slate-800 hover:bg-slate-900/50">
                      <TableCell>
                        <span className="font-medium text-slate-200">{key.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-950 px-2 py-1 rounded text-slate-400 font-mono">
                          {key.keyPrefix}
                        </code>
                      </TableCell>
                      <TableCell>
                        {key.projectId ? (
                          <span className="flex items-center gap-1 text-slate-400 text-sm">
                            <FolderKanban className="h-3 w-3" />
                            Project
                          </span>
                        ) : key.orgId ? (
                          <span className="flex items-center gap-1 text-slate-400 text-sm">
                            <Building2 className="h-3 w-3" />
                            Org
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">Global</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="border-slate-700 text-slate-500 text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {key.monthlyQuotaOverride?.toLocaleString() ?? (
                          <span className="text-slate-600">Dynamic</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {key.monthlyUsage.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {key.lastUsedAt
                          ? format(new Date(key.lastUsedAt), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {format(new Date(key.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-amber-400"
                            onClick={() => openQuotaDialog(key)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Dialog open={revokeDialogOpen && revokingKeyId === key.id} onOpenChange={(open) => {
                            if (!open) {
                              setRevokeDialogOpen(false);
                              setRevokingKeyId(null);
                            }
                          }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => {
                                setRevokingKeyId(key.id);
                                setRevokeDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                                Revoke API Key
                              </DialogTitle>
                              <DialogDescription className="text-slate-400">
                                Are you sure you want to revoke <strong>{key.name}</strong>?
                                This will immediately invalidate the key and cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setRevokeDialogOpen(false)}
                                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRevoke(key.id)}
                                className="border-red-700 text-red-400 hover:bg-red-500/10"
                              >
                                Revoke Key
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                      No API keys found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quota Edit Dialog */}
      <Dialog open={quotaDialogOpen} onOpenChange={setQuotaDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit API Key Quota</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set a monthly quota override for <strong>{editingKey?.name}</strong>.
              Leave empty to use the organization default (dynamic).
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {actionError}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="quota-input" className="text-sm text-slate-300">
              Monthly Quota Override
            </label>
            <input
              id="quota-input"
              type="number"
              min={0}
              value={quotaValue}
              onChange={(e) => setQuotaValue(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <p className="text-xs text-slate-500">Leave blank to use dynamic org quota.</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuotaDialogOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveQuota} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              Save Quota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
