"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { searchOrganizations } from "@/lib/actions/organizations";
import type { AdminOrganization, OrgTier } from "@/types/admin";

const PAGE_SIZE = 25;

const tierColors: Record<OrgTier, string> = {
  free: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  basic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function OrganizationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await searchOrganizations({
        query: query || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setOrgs(result.orgs);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`/organizations?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Organizations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage organizations, view memberships, and control billing tiers.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-semibold text-slate-100">{total}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search organizations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
        >
          Search
        </Button>
      </form>

      {/* Table */}
      <div className="rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Organization</TableHead>
              <TableHead className="text-slate-400">Tier</TableHead>
              <TableHead className="text-slate-400">Members</TableHead>
              <TableHead className="text-slate-400">MRR</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length > 0 ? (
              orgs.map((org) => (
                <TableRow key={org.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <Link
                      href={`/organizations/${org.id}`}
                      className="font-medium text-slate-200 hover:text-amber-400 transition-colors"
                    >
                      {org.name}
                    </Link>
                    <p className="text-xs text-slate-500">{org.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tierColors[org.tier]}>
                      {org.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{org.memberCount}</TableCell>
                  <TableCell className="text-slate-300">
                    ${org.mrr.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {format(new Date(org.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No organizations found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} organizations
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
