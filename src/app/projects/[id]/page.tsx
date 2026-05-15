"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, FolderKanban, Building2, Users, TestTube, GitBranch, ToggleLeft, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjectById, getProjectMembers, toggleRequirementsEnabled, softDeleteProject, restoreProject } from "@/lib/actions/projects";
import type { AdminProject } from "@/types/admin";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<AdminProject | null>(null);
  const [members, setMembers] = useState<{ id: string; email: string; name: string | null; role: string; joinedAt: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [proj, mems] = await Promise.all([
          getProjectById(projectId),
          getProjectMembers(projectId),
        ]);
        setProject(proj);
        setMembers(mems);
      } catch (error) {
        console.error("Failed to load project:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  const handleToggleRequirements = async () => {
    if (!project) return;
    try {
      await toggleRequirementsEnabled(projectId, !project.requirementsEnabled);
      setProject({ ...project, requirementsEnabled: !project.requirementsEnabled });
    } catch (error) {
      console.error("Failed to toggle requirements:", error);
      alert("Failed to update requirements setting.");
    }
  };

  const handleSoftDelete = async () => {
    if (!project || project.deletedAt) return;
    if (!confirm("Soft-delete this project? It can be restored later.")) return;
    try {
      await softDeleteProject(projectId);
      setProject({ ...project, deletedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project.");
    }
  };

  const handleRestore = async () => {
    if (!project || !project.deletedAt) return;
    if (!confirm("Restore this project?")) return;
    try {
      await restoreProject(projectId);
      setProject({ ...project, deletedAt: null });
    } catch (error) {
      console.error("Failed to restore project:", error);
      alert("Failed to restore project.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-slate-400">Project not found</div>
        <Link href="/projects">
          <Button variant="outline" className="border-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/projects">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
            <FolderKanban className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-100">{project.name}</h1>
              {project.deletedAt && (
                <Badge variant="outline" className="border-red-500/30 text-red-400">
                  Deleted
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {project.projectCode && <span className="font-mono">{project.projectCode}</span>}
              {project.projectCode && project.jiraProjectKey && " · "}
              {project.jiraProjectKey && <span>Jira: {project.jiraProjectKey}</span>}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Members
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-100">{project.memberCount}</p>
                    <p className="text-xs text-slate-500">Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TestTube className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-100">{project.testCaseCount}</p>
                    <p className="text-xs text-slate-500">Test Cases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-100">{project.testRunCount}</p>
                    <p className="text-xs text-slate-500">Test Runs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Organization</p>
                  <Link href={`/organizations/${project.orgId}`} className="text-sm text-slate-300 hover:text-amber-400">
                    {project.orgName}
                  </Link>
                </div>
              </div>
              <Separator className="bg-slate-800" />
              <div className="flex items-center gap-3">
                <FolderKanban className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Project ID</p>
                  <p className="text-sm text-slate-300 font-mono">{project.id}</p>
                </div>
              </div>
              {project.description && (
                <>
                  <Separator className="bg-slate-800" />
                  <div>
                    <p className="text-xs text-slate-500">Description</p>
                    <p className="text-sm text-slate-300">{project.description}</p>
                  </div>
                </>
              )}
              <Separator className="bg-slate-800" />
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-sm text-slate-300">{format(new Date(project.createdAt), "PPP")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Members</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                    >
                      <div>
                        <Link
                          href={`/users/${member.id}`}
                          className="text-sm font-medium text-slate-200 hover:text-amber-400"
                        >
                          {member.name || member.email}
                        </Link>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <Badge variant="outline" className="border-slate-700 text-slate-400">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No members found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-200">Requirements Module</p>
                  <p className="text-xs text-slate-500">Enable requirements tracking for this project</p>
                </div>
                <Button
                  variant={project.requirementsEnabled ? "default" : "outline"}
                  onClick={handleToggleRequirements}
                  className={
                    project.requirementsEnabled
                      ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }
                >
                  <ToggleLeft className="mr-2 h-4 w-4" />
                  {project.requirementsEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.deletedAt ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-200">Restore Project</p>
                    <p className="text-xs text-slate-500">This project is soft-deleted. Restore it to make it active again.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRestore}
                    className="border-emerald-700 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-200">Delete Project</p>
                    <p className="text-xs text-slate-500">Soft-delete this project. It can be restored later.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSoftDelete}
                    className="border-red-700 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
