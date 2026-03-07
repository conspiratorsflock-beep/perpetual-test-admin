"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, Search, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data - would come from database
const mockProjects = [
  { id: "1", name: "E2E Test Suite", org: "Acme Corp", orgId: "org_1", tests: 45, lastActivity: "2024-03-05" },
  { id: "2", name: "API Tests", org: "TechStart Inc", orgId: "org_2", tests: 23, lastActivity: "2024-03-04" },
  { id: "3", name: "Mobile Regression", org: "Global Solutions", orgId: "org_3", tests: 67, lastActivity: "2024-03-03" },
];

export default function ProjectsPage() {
  const [query, setQuery] = useState("");

  const filteredProjects = mockProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.org.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cross-organization project overview and management.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
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
      </div>

      {/* Projects Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Project</TableHead>
                <TableHead className="text-slate-400">Organization</TableHead>
                <TableHead className="text-slate-400">Tests</TableHead>
                <TableHead className="text-slate-400">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id} className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-slate-500" />
                      <span className="font-medium text-slate-200">{project.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/organizations/${project.orgId}`}
                      className="flex items-center gap-1 text-slate-400 hover:text-amber-400"
                    >
                      <Building2 className="h-3 w-3" />
                      {project.org}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-400">
                      {project.tests} tests
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">{project.lastActivity}</TableCell>
                </TableRow>
              ))}
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
