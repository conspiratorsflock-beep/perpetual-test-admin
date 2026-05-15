"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FolderKanban, Search, Building2, ChevronLeft, ChevronRight, TestTube, Users, GitBranch } from "lucide-react";
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
import { searchProjects } from "@/lib/actions/projects";
import type { AdminProject } from "@/types/admin";

const PAGE_SIZE = 25;

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await searchProjects({
        query: query || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setProjects(result.projects);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/projects?${params.toString()}`);
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cross-organization project overview and management.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-semibold text-slate-100">{total}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          disabled={isPending}
        >
          Search
        </Button>
      </form>

      <div className="rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400">Organization</TableHead>
              <TableHead className="text-slate-400">Members</TableHead>
              <TableHead className="text-slate-400">Test Cases</TableHead>
              <TableHead className="text-slate-400">Runs</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length > 0 ? (
              projects.map((project) => (
                <TableRow key={project.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-slate-200 hover:text-amber-400 transition-colors"
                    >
                      {project.name}
                    </Link>
                    {project.projectCode && (
                      <p className="text-xs text-slate-500 font-mono">{project.projectCode}</p>
                    )}
                    {project.deletedAt && (
                      <Badge variant="outline" className="mt-1 border-red-500/30 text-red-400 text-xs">
                        Deleted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/organizations/${project.orgId}`}
                      className="flex items-center gap-1 text-slate-400 hover:text-amber-400"
                    >
                      <Building2 className="h-3 w-3" />
                      {project.orgName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-500" />
                      {project.memberCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <span className="flex items-center gap-1">
                      <TestTube className="h-3 w-3 text-slate-500" />
                      {project.testCaseCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3 text-slate-500" />
                      {project.testRunCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {format(new Date(project.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  {isLoading ? "Loading..." : "No projects found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} projects
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
