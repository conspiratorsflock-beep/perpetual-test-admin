# Large — Task: Tests for user-groups, custom-roles, project-members-admin, global-search, setup-admin (23 functions)
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER PLAN_15 lands — main's log must show the reviewer's "Remove executed PLAN_15 doc" commit.

**Confirm-and-lock**: tests only; source must not change. This is the RBAC
write surface (groups, custom roles, member-role assignment) plus global
search and the admin bootstrap flow — the highest-stakes untested cluster.
If a test reveals a real bug (especially a gating or audit gap), REPORT it
prominently; don't fix or enshrine it.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/lib/actions/user-groups.ts` (387 lines, 11 exports, all
  `requireAdmin()`-gated, 7 audit-logged writes): `getUserGroups`,
  `getUserGroup`, `createUserGroup`, `updateUserGroup`, `deleteUserGroup`,
  `getGroupMembers`, `addUserToGroup`, `removeUserFromGroup`,
  `getProjectGroups`, `assignGroupToProject`, `removeGroupFromProject`.
- `src/lib/actions/custom-roles.ts` (314 lines, 6 exports, all gated, 3
  audit-logged writes): `getPermissionsCatalog`, `getCustomRoles`,
  `getCustomRole`, `createCustomRole`, `updateCustomRole`,
  `deleteCustomRole`.
- `src/lib/actions/project-members-admin.ts` (124 lines, 3 exports, all
  gated, 2 audit-logged writes): `getProjectMembersWithRoles`,
  `updateProjectMemberCustomRole`, `removeProjectMember`. NOTE: member role
  is DERIVED from linked `custom_roles(name)` — there is no
  `project_members.role` column; fixtures must reflect that join shape.
- `src/lib/actions/global-search.ts` (122 lines, 1 export): `globalSearch`
  — gated via `isCurrentUserAdmin()` directly (NOT `requireAdmin`); read
  the source for its actual non-admin behavior (throw vs empty result) and
  test that reality.
- `src/lib/actions/setup-admin.ts` (93 lines, 2 exports):
  `promoteUserToAdminByEmail`, `setupEmergencyAdmin`. **DELIBERATELY not
  requireAdmin-gated** — this is the first-admin bootstrap flow with its
  own guard logic (`isCurrentUserAdmin` + its own conditions). Test its
  ACTUAL guards; a failing "requireAdmin" expectation here would be a false
  test, not a finding.
- New files under `src/lib/actions/__tests__/`: `user-groups.test.ts`,
  `custom-roles.test.ts`, `project-members-admin.test.ts`,
  `global-search.test.ts`, `setup-admin.test.ts`.

## What MUST be true / asserted
- Gating: `requireAdmin`-rejection tests for the 20 gated functions (reject
  AND no DB call). For global-search and setup-admin, assert their REAL
  guard behavior per source — document it in the test names.
- All 12 audit-logged writes call `logAdminAction` with the real action
  string and targetType from source; DB error → throws AND no audit log.
- CRUD pairs round-trip sanely: create forwards the right insert payload;
  update only the provided fields; delete targets the right id (assert
  `.eq` args).
- `deleteCustomRole` / `deleteUserGroup`: if source checks for in-use
  references before deleting, test BOTH branches (blocked vs allowed).
- `globalSearch`: queries the expected tables with `ilike` patterns built
  from the query string; result buckets keep their wire `type` values;
  empty query behavior per source.
- Pure test-addition: full suite = previous baseline + new tests; typecheck
  clean; gate green after EVERY commit; full-suite numbers only.

## Branch workflow
1. Confirm precondition, then `kimi/rbac-search-coverage` off local main.
2. One commit per test file + this plan doc. No `git add -A`.
3. Do NOT commit `docs/plans/kimi-running-log.md` (gitignored).

## Guardrails
- This is the largest plan (23 functions). If it can't finish in one
  sitting, finish per-file commits with gate green at each — a clean
  partial report beats a rushed full one. Defer whole FILES, never half a
  file.
- setup-admin's Clerk interactions (clerkClient user lookups/metadata
  writes) need Clerk server mocks — the shared setup in `src/test/setup.ts`
  already mocks `@clerk/nextjs/server`; extend per-test with `vi.mocked`,
  don't re-mock the module locally if it fights the global mock.
- Permission keys in the catalog and role payloads are wire values — copy
  from source.
- Stuck = marker + reason + report. Never weaken assertions.

## Report back to Claude
- Branch + commits; tests added per file; deferred files (count + reason);
  real findings (file:line, consequence — gating/audit gaps are CRITICAL
  findings); full-suite before/after + typecheck; **verified vs NOT
  verified** list.
