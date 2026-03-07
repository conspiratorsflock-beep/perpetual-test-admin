"use client";

/**
 * Client-side utility for downloading exported files.
 * 
 * Usage:
 * ```tsx
 * "use client";
 * import { downloadFile } from "@/lib/utils/export-download";
 * import { exportAuditLogsToCSV } from "@/lib/actions/audit-export";
 * 
 * async function handleDownload() {
 *   const csv = await exportAuditLogsToCSV();
 *   downloadFile(csv, "audit-logs.csv", "text/csv");
 * }
 * ```
 */

/**
 * Trigger a file download in the browser.
 * 
 * @param content - The file content as a string
 * @param filename - The name for the downloaded file
 * @param contentType - The MIME type (e.g., "text/csv", "application/json")
 */
export function downloadFile(content: string, filename: string, contentType: string): void {
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

/**
 * Download JSON data as a file.
 */
export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, "application/json");
}

/**
 * Download CSV data as a file.
 */
export function downloadCSV(csv: string, filename: string): void {
  downloadFile(csv, filename, "text/csv");
}
