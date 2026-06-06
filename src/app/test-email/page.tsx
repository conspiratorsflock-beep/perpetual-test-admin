"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { isTestEmailProvisioned, getTestEmailOverview, getTestEmailAbuseSignals, searchTestEmailMailboxes, getMailboxMessageVolume, getTestEmailInboundHealth, getTestEmailHealth, forceExpireMailbox, deleteMailbox } from "@/lib/actions/test-email";
import { listTestEmailDomains, addTestEmailDomain, deactivateTestEmailDomain, reactivateTestEmailDomain } from "@/lib/actions/test-email-domains";
import type { TestEmailDomain, TestEmailMailbox, TestEmailOverview, TestEmailAbuseRow, TestEmailInboundHealth, TestEmailHealth } from "@/types/admin";

export default function TestEmailPage() {
  const [provisioned, setProvisioned] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<TestEmailOverview | null>(null);
  const [abuse, setAbuse] = useState<{ byActiveCount: TestEmailAbuseRow[]; by24hCreation: TestEmailAbuseRow[]; nearCap: TestEmailAbuseRow[] } | null>(null);
  const [health, setHealth] = useState<TestEmailHealth | null>(null);
  const [inboundHealth, setInboundHealth] = useState<TestEmailInboundHealth[]>([]);
  const [domains, setDomains] = useState<TestEmailDomain[]>([]);
  const [mailboxes, setMailboxes] = useState<TestEmailMailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<TestEmailMailbox | null>(null);
  const [mailboxVolume, setMailboxVolume] = useState<{ total: number; unread: number; lastReceivedAt: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newDomainNotes, setNewDomainNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDomainSubmitting, setIsDomainSubmitting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prov, ov, ab, hl, ib, doms] = await Promise.all([
        isTestEmailProvisioned(),
        getTestEmailOverview(),
        getTestEmailAbuseSignals(),
        getTestEmailHealth(),
        getTestEmailInboundHealth(),
        listTestEmailDomains(),
      ]);
      setProvisioned(prov);
      setOverview(ov);
      setAbuse(ab);
      setHealth(hl);
      setInboundHealth(ib);
      setDomains(doms);
    } catch (error) {
      console.error("Failed to load test email data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearchMailboxes = async () => {
    setSelectedMailbox(null);
    setMailboxVolume(null);
    const results = await searchTestEmailMailboxes(searchQuery);
    setMailboxes(results);
  };

  const handleSelectMailbox = async (mb: TestEmailMailbox) => {
    setSelectedMailbox(mb);
    const vol = await getMailboxMessageVolume(mb.id);
    setMailboxVolume(vol);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setIsDomainSubmitting(true);
    try {
      await addTestEmailDomain(newDomain, newDomainNotes || null);
      setNewDomain("");
      setNewDomainNotes("");
      const updated = await listTestEmailDomains();
      setDomains(updated);
    } catch (error) {
      console.error("Failed to add domain:", error);
      alert(error instanceof Error ? error.message : "Failed to add domain");
    } finally {
      setIsDomainSubmitting(false);
    }
  };

  const handleDeactivateDomain = async (id: string) => {
    if (!confirm("Deactivate this domain? New test emails cannot be created on it; existing inboxes keep working until they expire.")) return;
    setIsActionLoading(id);
    try {
      await deactivateTestEmailDomain(id);
      const updated = await listTestEmailDomains();
      setDomains(updated);
    } catch (error) {
      console.error("Failed to deactivate domain:", error);
      alert(error instanceof Error ? error.message : "Failed to deactivate domain");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReactivateDomain = async (id: string) => {
    setIsActionLoading(id);
    try {
      await reactivateTestEmailDomain(id);
      const updated = await listTestEmailDomains();
      setDomains(updated);
    } catch (error) {
      console.error("Failed to reactivate domain:", error);
      alert(error instanceof Error ? error.message : "Failed to reactivate domain");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleForceExpire = async (id: string) => {
    if (!confirm("Force-expire this mailbox? It will be purged by the cleanup cron.")) return;
    setIsActionLoading(id);
    try {
      await forceExpireMailbox(id);
      await loadAll();
      if (selectedMailbox?.id === id) {
        setSelectedMailbox(null);
        setMailboxVolume(null);
      }
    } catch (error) {
      console.error("Failed to expire mailbox:", error);
      alert(error instanceof Error ? error.message : "Failed to expire mailbox");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDeleteMailbox = async (id: string) => {
    if (!confirm("Permanently delete this mailbox and all its messages? This cannot be undone.")) return;
    setIsActionLoading(id);
    try {
      await deleteMailbox(id);
      await loadAll();
      setMailboxes((prev) => prev.filter((m) => m.id !== id));
      if (selectedMailbox?.id === id) {
        setSelectedMailbox(null);
        setMailboxVolume(null);
      }
    } catch (error) {
      console.error("Failed to delete mailbox:", error);
      alert(error instanceof Error ? error.message : "Failed to delete mailbox");
    } finally {
      setIsActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (provisioned === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Test Email Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Monitor test email mailboxes, inbound health, and abuse signals.</p>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-medium">Test Email tables not yet provisioned by the app</p>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              The app-owned <code className="text-slate-300">test_email_*</code> tables are not available in the database yet.
              This dashboard will populate automatically once the app ships them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDomains = domains.filter((d) => d.isActive);
  const deactivatedDomains = domains.filter((d) => !d.isActive);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Test Email Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Monitor mailboxes, inbound health, abuse signals, and domain config.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Active Mailboxes" value={overview.activeMailboxes} icon={Inbox} />
          <MetricCard label="Created (24h)" value={overview.created24h} icon={Clock} />
          <MetricCard label="Messages (24h)" value={overview.messages24h} icon={Mail} />
          <MetricCard label="Avg Messages / Mailbox" value={overview.avgMessagesPerMailbox} icon={Mail} />
        </div>
      )}

      {/* Domains */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add domain */}
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 max-w-sm"
              required
            />
            <Input
              placeholder="Notes (optional)"
              value={newDomainNotes}
              onChange={(e) => setNewDomainNotes(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 max-w-sm"
            />
            <Button
              type="submit"
              disabled={isDomainSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {isDomainSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Domain"}
            </Button>
          </form>

          {/* Active domains */}
          <div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Active</h3>
            {activeDomains.length > 0 ? (
              <div className="space-y-2">
                {activeDomains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{d.domain}</p>
                      {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
                      <p className="text-xs text-slate-600">Added by {d.createdBy ?? "unknown"}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      onClick={() => handleDeactivateDomain(d.id)}
                      disabled={isActionLoading === d.id}
                    >
                      {isActionLoading === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                      Deactivate
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active domains.</p>
            )}
          </div>

          {/* Deactivated domains */}
          {deactivatedDomains.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Deactivated</h3>
              <div className="space-y-2">
                {deactivatedDomains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2 opacity-70">
                    <div>
                      <p className="text-sm font-medium text-slate-400">{d.domain}</p>
                      {d.deactivatedAt && (
                        <p className="text-xs text-slate-600">
                          Deactivated {formatDistanceToNow(new Date(d.deactivatedAt), { addSuffix: true })}
                          {d.deactivatedBy && ` by ${d.deactivatedBy}`}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      onClick={() => handleReactivateDomain(d.id)}
                      disabled={isActionLoading === d.id}
                    >
                      {isActionLoading === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Reactivate
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abuse Signals */}
      {abuse && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AbuseTable title="Top Users by Active Mailboxes" rows={abuse.byActiveCount} showActive />
          <AbuseTable title="Users Near or At Cap (≥20)" rows={abuse.nearCap} showActive />
        </div>
      )}

      {/* Mailbox Explorer */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Mailbox Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by address, local part, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchMailboxes()}
              className="bg-slate-950 border-slate-800 text-slate-100"
            />
            <Button
              onClick={handleSearchMailboxes}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </div>

          {mailboxes.length > 0 && (
            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Address</TableHead>
                    <TableHead className="text-slate-400">User ID</TableHead>
                    <TableHead className="text-slate-400">Label</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400">Expires</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mailboxes.map((mb) => (
                    <TableRow
                      key={mb.id}
                      className={`border-slate-800 cursor-pointer ${selectedMailbox?.id === mb.id ? "bg-slate-800/50" : "hover:bg-slate-900/50"}`}
                      onClick={() => handleSelectMailbox(mb)}
                    >
                      <TableCell className="text-slate-200 text-sm">{mb.address}</TableCell>
                      <TableCell className="text-slate-400 text-xs font-mono truncate max-w-[120px]">{mb.userId}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{mb.label ?? "—"}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{format(new Date(mb.createdAt), "MMM d")}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{format(new Date(mb.expiresAt), "MMM d")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            onClick={(e) => { e.stopPropagation(); handleForceExpire(mb.id); }}
                            disabled={isActionLoading === mb.id}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Expire
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => { e.stopPropagation(); handleDeleteMailbox(mb.id); }}
                            disabled={isActionLoading === mb.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedMailbox && mailboxVolume && (
            <div className="rounded-md border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-medium text-slate-200 mb-2">{selectedMailbox.address}</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Messages</p>
                  <p className="text-lg font-semibold text-slate-100">{mailboxVolume.total}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Unread</p>
                  <p className="text-lg font-semibold text-slate-100">{mailboxVolume.unread}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Received</p>
                  <p className="text-sm text-slate-300">
                    {mailboxVolume.lastReceivedAt
                      ? formatDistanceToNow(new Date(mailboxVolume.lastReceivedAt), { addSuffix: true })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inbound Health */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Inbound Health (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          {inboundHealth.length > 0 ? (
            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Event Type</TableHead>
                    <TableHead className="text-slate-400">24h</TableHead>
                    <TableHead className="text-slate-400">7d</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboundHealth.map((row) => (
                    <TableRow key={row.eventType} className="border-slate-800 hover:bg-slate-900/50">
                      <TableCell className="text-slate-200 text-sm">
                        <Badge variant="outline" className={eventTypeColor(row.eventType)}>
                          {row.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{row.count24h.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-300">{row.count7d.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No inbound events in the last 7 days.</p>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Health */}
      {health && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Cleanup Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Latest Cleanup</p>
                <p className="text-sm text-slate-300">
                  {health.latestCleanup
                    ? formatDistanceToNow(new Date(health.latestCleanup.ranAt), { addSuffix: true })
                    : "No cleanup runs recorded"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mailboxes Purged (last run)</p>
                <p className="text-lg font-semibold text-slate-100">
                  {health.latestCleanup?.mailboxesPurged ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Expired Backlog</p>
                <p className="text-lg font-semibold text-slate-100">{health.expiredBacklog}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Config Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Inbound domain and MX routing configured upstream by the app team.</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Block-user and cap-adjustment controls are managed in the app repo (no admin-writable schema yet).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <p className="mt-2 text-2xl font-semibold text-slate-100">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function AbuseTable({ title, rows, showActive }: { title: string; rows: TestEmailAbuseRow[]; showActive?: boolean }) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">User ID</TableHead>
                  {showActive && <TableHead className="text-slate-400">Active Mailboxes</TableHead>}
                  <TableHead className="text-slate-400">Created (24h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.userId} className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell className="text-slate-300 text-xs font-mono truncate max-w-[200px]">{row.userId}</TableCell>
                    {showActive && (
                      <TableCell className="text-slate-300">
                        <span className={row.activeMailboxes >= 25 ? "text-red-400 font-medium" : row.activeMailboxes >= 20 ? "text-amber-400" : ""}>
                          {row.activeMailboxes}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-slate-300">{row.created24h}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No users match this criteria.</p>
        )}
      </CardContent>
    </Card>
  );
}

function eventTypeColor(eventType: string): string {
  switch (eventType) {
    case "ingest_ok":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "signature_failed":
    case "domain_rejected":
    case "mailbox_not_found":
    case "mailbox_expired":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "duplicate":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}
