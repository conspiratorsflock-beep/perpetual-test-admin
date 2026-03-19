"use server";

import { getAuditLogs } from "@/lib/audit/logger";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import type { AuditTargetType } from "@/types/admin";

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Unauthorized");
}

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
  await requireAdmin();
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
  await requireAdmin();
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
 * 
 * NOTE: This is a client-side helper. Copy this function to your client component
 * or use the downloadExport utility from @/lib/utils/export-download
 * 
 * Example usage in a client component:
 * ```tsx
 * "use client";
 * import { exportAuditLogsToCSV } from "@/lib/actions/audit-export";
 * 
 * async function handleDownload() {
 *   const csv = await exportAuditLogsToCSV();
 *   const blob = new Blob([csv], { type: "text/csv" });
 *   const url = URL.createObjectURL(blob);
 *   const link = document.createElement("a");
 *   link.href = url;
 *   link.download = "audit-logs.csv";
 *   document.body.appendChild(link);
 *   link.click();
 *   document.body.removeChild(link);
 *   URL.revokeObjectURL(url);
 * }
 * ```
 */
