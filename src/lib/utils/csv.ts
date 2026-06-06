/**
 * Build a well-formed CSV string with proper escaping.
 * Handles commas, quotes, and newlines in cell values.
 */
export function toCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
