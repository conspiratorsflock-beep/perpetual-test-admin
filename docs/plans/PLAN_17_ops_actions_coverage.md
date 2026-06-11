# Medium — Task: Tests for integrations, error-logs, api-usage (12 functions)
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER PLAN_16 lands — main's log must show the reviewer's "Remove executed PLAN_16 doc" commit.

**Confirm-and-lock**: tests only; source must not change. Operational
surfaces: integration health, error-log management, API usage metrics. If a
test reveals a real bug, report it; don't fix or enshrine it.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/lib/actions/integrations.ts` (255 lines, 3 exports, all gated, 1
  audit-logged write): `searchIntegrations`, `disconnectIntegration`
  (write), `getIntegrationMetrics`.
- `src/lib/actions/error-logs.ts` (234 lines, 5 exports, all gated, 1
  audit-logged write): `logError`, `getErrorLogs`, `getErrorStats`,
  `purgeOldErrors` (write), `exportErrorLogsToCSV`.
- `src/lib/actions/api-usage.ts` (128 lines, 4 exports, all gated, reads
  the real `api_usage_logs` / `org_api_usage` tables): `getApiCallsToday`,
  `getApiCallsThisMonth`, `getApiCallsComparison`, `recordApiCall`.
- New files under `src/lib/actions/__tests__/`: `integrations.test.ts`,
  `error-logs.test.ts`, `api-usage.test.ts`.

## What MUST be true / asserted
- Non-admin gate ×12: rejects AND no DB call (`logError` and `recordApiCall`
  too — read the source; if either is deliberately callable ungated as an
  internal recorder, that's a property to ASSERT and flag in the report,
  not assume away).
- `searchIntegrations`: provider/status filters forwarded to the chain;
  result mapping spot-checked with a null-heavy row.
- `disconnectIntegration`: happy path updates status + calls
  `logAdminAction` with the real action string; DB error → throws, no log.
- `getErrorLogs`: filters (level/source/date) forwarded; pagination args.
- `purgeOldErrors`: deletes with the right cutoff (use `vi.setSystemTime`),
  audit-logged; error path throws without logging.
- `exportErrorLogsToCSV`: RFC 4180 escaping — reuse the expectations style
  from the existing users/orgs CSV export tests (quotes, commas, newlines
  in fields); header row matches source.
- `getApiCallsToday` / `ThisMonth` / `Comparison`: date-window boundaries
  via `vi.setSystemTime` (month boundary fixture for `year_month`
  derivation); comparison math (pct change, zero-denominator branch).
- Pure test-addition: full suite = previous baseline + new tests; typecheck
  clean; gate green after EVERY commit; full-suite numbers only.

## Branch workflow
1. Confirm precondition, then `kimi/ops-actions-coverage` off local main.
2. One commit per test file + this plan doc. No `git add -A`.
3. Do NOT commit `docs/plans/kimi-running-log.md` (gitignored).

## Guardrails
- `api-usage.ts` was reconciled onto REAL tables (`api_usage_logs`,
  `org_api_usage` with `year_month`, no `total_tokens`) — phantom
  `api_usage_daily` / `increment_api_calls` are gone; if you find a
  reference, that's a finding.
- `org_api_usage.year_month` is a string key (e.g. "2026-06") — month/year
  are DERIVED from it; fixtures must use the real format from source.
- Error levels/sources are wire values from source.
- Stuck = marker + reason + report. Never weaken assertions.

## Report back to Claude
- Branch + commits; tests added per file; real findings (file:line,
  consequence); full-suite before/after + typecheck; **verified vs NOT
  verified** list.
