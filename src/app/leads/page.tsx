"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Users,
  TrendingUp,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchLeads, markLeadConverted, deleteLead, getLeadMetrics } from "@/lib/actions/sandbox-leads";
import type { SandboxLead } from "@/types/admin";

const PAGE_SIZE = 25;

export default function LeadsPage() {
  const [leads, setLeads] = useState<SandboxLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("");
  const [query, setQuery] = useState("");
  const [convertedFilter, setConvertedFilter] = useState<string>("");
  const [metrics, setMetrics] = useState<{
    total: number;
    converted: number;
    conversionRate: number;
    bySource: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, m] = await Promise.all([
        searchLeads({
          source: sourceFilter || undefined,
          query: query || undefined,
          converted: convertedFilter === "converted" ? true : convertedFilter === "open" ? false : undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        getLeadMetrics(),
      ]);
      setLeads(result.leads);
      setTotal(result.total);
      setMetrics(m);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter, query, convertedFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConvert = async (id: string) => {
    setActionError(null);
    try {
      await markLeadConverted(id);
      fetchData();
    } catch (error) {
      console.error(error);
      setActionError("Failed to convert lead.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    setActionError(null);
    try {
      await deleteLead(id);
      fetchData();
    } catch (error) {
      console.error(error);
      setActionError("Failed to delete lead.");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Sandbox Leads</h1>
        <p className="mt-1 text-sm text-slate-400">
          Track self-service signups, demo requests, and conversion funnel.
        </p>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.total || 0}</p>
                <p className="text-xs text-slate-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{metrics?.converted || 0}</p>
                <p className="text-xs text-slate-500">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {metrics ? `${metrics.conversionRate}%` : "—"}
                </p>
                <p className="text-xs text-slate-500">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {metrics ? Object.keys(metrics.bySource).length : 0}
                </p>
                <p className="text-xs text-slate-500">Sources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 max-w-md">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search by email..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All sources</SelectItem>
            {metrics && Object.keys(metrics.bySource).map((s) => (
              <SelectItem key={s} value={s} className="text-slate-300">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={convertedFilter} onValueChange={(v) => { setConvertedFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-slate-900 border-slate-700 text-slate-300">
            <SelectValue placeholder="All leads" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-slate-300">All leads</SelectItem>
            <SelectItem value="converted" className="text-slate-300">Converted</SelectItem>
            <SelectItem value="open" className="text-slate-300">Open</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Organization</TableHead>
              <TableHead className="text-slate-400">Source</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length > 0 ? (
              leads.map((lead) => (
                <TableRow key={lead.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell className="text-slate-200">{lead.email}</TableCell>
                  <TableCell>
                    {lead.orgId ? (
                      <Link href={`/organizations/${lead.orgId}`} className="text-slate-300 hover:text-amber-400">
                        {lead.orgName || "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-400 capitalize">
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {lead.convertedAt ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Converted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                        Open
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!lead.convertedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-emerald-400"
                          onClick={() => handleConvert(lead.id)}
                          title="Mark converted"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-400"
                        onClick={() => handleDelete(lead.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No leads found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
