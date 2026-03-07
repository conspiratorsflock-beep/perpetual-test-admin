"use server";

import { getAuditLogs } from "@/lib/audit/logger";
import type { AuditTargetType } from "@/types/admin";

/**
 * Export audit logs to CSV format.
 */
export async function exportAuditLogsToCSV({
  startDate,
  endDate,
  targetType,
  adminId,
  action,
}: {
  startDate?: string;
  endDate?: string;
  targetType?: AuditTargetType;
  adminId?: string;
  action?: string;
} = {}): Promise<string> {
  const { logs } = await getAuditLogs({
    limit: 10000, // Max export
    startDate,
    endDate,
    targetType,
    adminId,
    action,
  });

  // CSV header
  const headers = [
    "ID",
    "Timestamp",
    "Admin Email",
    "Action",
    "Target Type",
    "Target ID",
    "Target Name",
    "Metadata",
  ];

  // CSV rows
  const rows = logs.map((log) => [
    log.id,
    log.createdAt,
    `"${log.adminEmail}"`,
    log.action,
    log.targetType,
    log.targetId || "",
    log.targetName ? `"${log.targetName.replace(/"/g, '""')}"` : "",
    `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Export audit logs to JSON format.
 */
export async function exportAuditLogsToJSON({
  startDate,
  endDate,
  targetType,
  adminId,
  action,
}: {
  startDate?: string;
  endDate?: string;
  targetType?: AuditTargetType;
  adminId?: string;
  action?: string;
} = {}): Promise<string> {
  const { logs } = await getAuditLogs({
    limit: 10000,
    startDate,
    endDate,
    targetType,
    adminId,
    action,
  });

  return JSON.stringify(logs, null, 2);
}

/**
 * Download export file (helper to trigger browser download).
 */
export function downloadExport(content: string, filename: string, contentType: string): void {
  // This is a client-side helper - should be used in useEffect or event handler
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
