/**
 * Named query limits to prevent unbounded list queries from becoming
 * multi-MB payloads at beta scale.
 *
 * Values are chosen per consumer:
 * - Queue/table pages: 200 (page-size)
 * - Per-ticket child rows (comments, events, links): 500 (far above plausible)
 * - Reference tables (canned responses, team, feature flags): 500
 * - CSV exports: 5000 (high, but not unbounded)
 * - Stats/count queries: 10000 (high to avoid undercounting)
 * - Health checks: 1000
 */

export const QUEUE_PAGE_LIMIT = 200;
export const PER_TICKET_CHILD_LIMIT = 500;
export const REFERENCE_TABLE_LIMIT = 500;
export const EXPORT_ROW_LIMIT = 5000;
export const LIST_DEFAULT_LIMIT = 200;
export const STATS_QUERY_LIMIT = 10_000;
export const HEALTH_CHECK_LIMIT = 1000;
