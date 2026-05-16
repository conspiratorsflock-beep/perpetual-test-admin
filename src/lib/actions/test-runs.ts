"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { TestRun, TestRunStatus } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

export async function getProjectTestRuns(
  projectId: string,
  {
    status,
    limit = 50,
    offset = 0,
  }: {
    status?: TestRunStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ testRuns: TestRun[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("test_runs")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .order("run_sequence_number", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch test runs: ${error.message}`);

  const testRuns = (data || []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    releaseId: row.release_id,
    buildId: row.build_id,
    name: row.name,
    description: row.description,
    environment: row.environment,
    customEnvironment: row.custom_environment,
    status: row.status as TestRunStatus,
    inheritancePolicy: row.inheritance_policy as "snapshot" | "live",
    parentRunId: row.parent_run_id,
    createdBy: row.created_by,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    runSequenceNumber: row.run_sequence_number,
    configurationCount: row.configuration_count ?? 0,
  }));

  return { testRuns, total: count || 0 };
}

export async function getTestRunById(id: string): Promise<TestRun | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("test_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    releaseId: data.release_id,
    buildId: data.build_id,
    name: data.name,
    description: data.description,
    environment: data.environment,
    customEnvironment: data.custom_environment,
    status: data.status as TestRunStatus,
    inheritancePolicy: data.inheritance_policy as "snapshot" | "live",
    parentRunId: data.parent_run_id,
    createdBy: data.created_by,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    runSequenceNumber: data.run_sequence_number,
    configurationCount: data.configuration_count ?? 0,
  };
}
