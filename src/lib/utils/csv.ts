/**
 * Build a well-formed CSV string with proper escaping.
 * Handles commas, quotes, and newlines in cell values.
 *
 * Formula-injection guard: string cells starting with =, +, @, tab, or CR
 * are prefixed with a single quote so they are treated as text by Excel/Sheets.
 * Typed numbers and booleans are NOT guarded (e.g. numeric -5 stays -5).
 */
export function toCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const esc = (v: string | number | boolean | null | undefined) => {
    if (v == null) return "";
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    // v is string — guard formula injection before RFC 4180 escaping
    let s = v;
    if (/^[=+@\t\r]/.test(s)) {
      s = "'" + s;
    }
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
