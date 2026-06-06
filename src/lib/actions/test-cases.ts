"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { TestCase, TestCasePriority, TestCaseStatus } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

export async function getProjectTestCases(
  projectId: string,
  {
    status,
    priority,
    limit = 50,
    offset = 0,
  }: {
    status?: TestCaseStatus;
    priority?: TestCasePriority;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ testCases: TestCase[]; total: number }> {
  await requireAdmin();

  let query = supabaseAdmin
    .from("test_cases")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("tc_sequence_number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch test cases: ${error.message}`);

  const testCases = (data || []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    sectionId: row.section_id,
    title: row.title,
    description: row.description,
    priority: row.priority as TestCasePriority,
    status: row.status as TestCaseStatus,
    steps: ((row.steps as Array<{ order: number; action: string; expected_result: string }>) || []).map(
      (s) => ({
        order: s.order,
        action: s.action,
        expectedResult: s.expected_result,
      })
    ),
    isAdhoc: row.is_adhoc ?? false,
    createdBy: row.created_by,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
    deletedAt: row.deleted_at,
    tcSequenceNumber: row.tc_sequence_number ?? 0,
    preconditions: row.preconditions,
    externalId: row.external_id,
    automationStatus: row.automation_status as TestCase["automationStatus"],
    executionMode: row.execution_mode as TestCase["executionMode"],
    version: row.version ?? 1,
    isLatestVersion: row.is_latest_version ?? true,
    previousVersionId: row.previous_version_id,
    versionNotes: row.version_notes,
    testCaseType: row.test_case_type as "standard" | "gherkin",
    gherkinContent: row.gherkin_content,
    gherkinScenarioType: row.gherkin_scenario_type,
  }));

  return { testCases, total: count || 0 };
}

export async function getTestCaseById(id: string): Promise<TestCase | null> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("test_cases")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    sectionId: data.section_id,
    title: data.title,
    description: data.description,
    priority: data.priority as TestCasePriority,
    status: data.status as TestCaseStatus,
    steps: ((data.steps as Array<{ order: number; action: string; expected_result: string }>) || []).map(
      (s) => ({
        order: s.order,
        action: s.action,
        expectedResult: s.expected_result,
      })
    ),
    isAdhoc: data.is_adhoc ?? false,
    createdBy: data.created_by,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
    deletedAt: data.deleted_at,
    tcSequenceNumber: data.tc_sequence_number ?? 0,
    preconditions: data.preconditions,
    externalId: data.external_id,
    automationStatus: data.automation_status as TestCase["automationStatus"],
    executionMode: data.execution_mode as TestCase["executionMode"],
    version: data.version ?? 1,
    isLatestVersion: data.is_latest_version ?? true,
    previousVersionId: data.previous_version_id,
    versionNotes: data.version_notes,
    testCaseType: data.test_case_type as "standard" | "gherkin",
    gherkinContent: data.gherkin_content,
    gherkinScenarioType: data.gherkin_scenario_type,
  };
}
