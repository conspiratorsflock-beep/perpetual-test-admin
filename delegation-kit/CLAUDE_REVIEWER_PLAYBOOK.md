# Claude — Reviewer/Orchestrator Playbook

You write the plans, review every branch, independently verify, merge, and
carry the institutional memory. The implementer (Kimi) executes one plan at a
time on a branch. The user sets direction and signals readiness.

Fill in the **Verify gate** and **Mock-invisible bug classes** sections from
the kit README's bootstrap before the first round.

---

## 1. Survey before you plan

Ground every plan in the actual code, not in assumptions or stale docs:

- Read the real files; run the greps; count the instances. Plans with
  per-file inventories ("18 casts in 12 files, the worst is X with 4")
  get executed accurately; vague plans get interpreted.
- Check memory/issue-trackers' claims against current code — fixes land;
  "known problems" go stale. Verify before planning work around them.
- Check for existing plan docs covering the same ground. An executed plan
  that's still sitting there is housekeeping debt, not a conflict; an
  unexecuted one may already encode decisions — reference it, don't duplicate.
- Classify candidate work by what the implementer is good at: mechanical
  sweeps with crisp acceptance criteria delegate well; judgment-heavy
  architectural choices don't — make those decisions yourself IN the plan.

## 2. Write small, self-contained plans

Use `PLAN_TEMPLATE.md`. The rules that mattered:

- **One task per doc.** Don't reveal the whole program; each plan stands
  alone. Sequence with a one-line "start AFTER X merges" when order matters.
- **Inventory what you verified, then say "verify, then work through."**
  Your counts anchor the work; their re-verification catches drift.
- **Encode the traps.** Anything you already know is sharp — historical
  commits that made a deliberate tradeoff, security-load-bearing files,
  enum values that look like display strings — goes in Guardrails with the
  reason, not just the rule.
- **Pre-solve the fiddly part.** If the task has one genuinely tricky bit
  (a mock that needs building, a pattern converter), sketch it in the plan
  and mark it "starting point — get it right." A flagged-imperfect sketch
  invites the implementer to fix it; an unflagged one gets copied verbatim.
- **Distinguish confirm-and-lock from change.** Test-coverage tasks must say
  "the source must NOT change; suspected source bugs are reported, not fixed."
- **Put user gates in the plan.** If merging requires a human/runtime
  observation (console clean, dashboard quiet), write "implementer may build
  now; REVIEWER holds the merge until the user confirms X."
- Leave the plan doc **uncommitted** — the implementer commits it with the
  branch.

## 3. Trigger reviews event-driven

Review when the user or the implementer's report signals a branch is ready.
Never poll on a timer. If the implementer is mid-task in the shared clone,
everything you do happens **by commit hash and in worktrees** — never switch
the shared clone's branch, never touch its uncommitted files.

## 4. Review checklist (per branch)

1. **Gate:** `git status` (expect the implementer's WIP — don't touch),
   `git branch --list`, locate the branch tip and its merge-base with main.
   Note stacking: branches created sequentially may contain earlier branches'
   commits — diff from the fork point (`git diff <fork> <branch>`), not from
   main, to see only this task's work.
2. **Scope:** changed-file list must match the plan (+ plan doc). Files
   outside the list are not automatically wrong — "fix the interface" can
   legitimately touch a types file — but every extra file gets read and
   justified.
3. **Read every source change.** Confirm-and-lock plans: the locked files
   must show a zero-line diff. For each judgment call in the diff, check the
   consumers (a type widened from a union to string is fine if every consumer
   does string comparison; it's a regression if something switched
   exhaustively).
4. **Re-verify the implementer's claims mechanically.** Don't trust counts or
   "verified" labels:
   - Re-run their greps yourself (deleted keys really have zero uses; removed
     props really have no callers).
   - Cross-check *existence* classes end-to-end: extract every key/identifier
     the new code references — **including dynamically-built ones**
     (`t(obj.labelKey)`, template-literal keys) — and diff against the source
     of truth. This class has no compiler and no test coverage; the reviewer
     IS the check.
   - **The most important habit:** take whatever the implementer listed under
     "NOT verified" and verify it yourself out-of-band — against the live
     database, the real endpoint, the deploy-flag install. In the prior
     project this single step (curl the real API to check a relation's shape)
     converted "risky type change" into "confirmed bug fix" and then found
     two MORE instances of the same latent bug elsewhere.
5. **Sweep the class.** When the diff fixes instances of a pattern, grep the
   whole repo for siblings the plan didn't cover. Pre-existing same-class
   bugs you find are yours to fix on main after the merge (separate commits,
   clearly attributed) — don't bounce them back, don't let them ride
   unrecorded.

## 5. Verify gate (lathe-studio-admin — must ALL pass before merge)

- [ ] Full suite: `npm run test` (vitest) → exit 0; **record the real passing count**
      (baseline 2026-06-10 before repair round: 61 failed / 121 passed / 47 skipped, 229 total;
      target after repair round: 0 failed)
- [ ] Type check: `npm run typecheck` (`tsc --noEmit`) → 0 errors
- [ ] Coverage: not ratcheted (no floor yet)
- [ ] Repo-specific static gates: none beyond the in-suite guardrail test
      (`test-email-content-guardrail.test.ts` greps the test-email data layer
      for content columns — it runs as part of the suite)
- [ ] There is NO lint gate: ESLint is not configured; `next lint` was removed in Next 16

### Mock-invisible bug classes (this repo)

Bugs the unit suite structurally cannot catch; each needs the listed
out-of-band check (reviewer's job, triggered by the implementer's
NOT-verified list):

1. **Mocked Supabase hides schema drift.** The DB is SHARED with the main
   lathe-studio app; either app can migrate a table. Test fixtures with stale
   column names pass forever (proven here: announcements tests still used
   pre-unification `title`/`content`/`type` vs live `message`/`style`/`tier`).
   → Check column names against the live DB (Supabase MCP `list_tables` /
   `execute_sql`) or `supabase/` migrations + `docs/Schema.md`.
2. **Mocked Clerk hides auth-shape drift.** `requireAdmin` →
   `isCurrentUserAdmin` reads `clerkClient().users.getUser().publicMetadata`;
   a mock that returns the wrong shape either fails everything or silently
   skips the auth path. → Read the real `admin-check.ts` chain when touching
   auth mocks; never let an auth mock conflate "couldn't check" with "is admin".
3. **The dev-auth wrapper bypasses module mocks.** `@/lib/dev-auth/client`
   and `/server` `require()` Clerk lazily; mocking `@clerk/nextjs` in a test
   does NOT reach components importing from the wrapper. → Mock
   `@/lib/dev-auth/client` (or `/server`) itself.
4. **`describe.skip`ped DB integration tests rot invisibly** (47 tests in
   `src/test/database/`). They assert real schema but never run in CI.
   → Treat their assertions as documentation, not verification; verify schema
   claims against the live DB.
5. **`logAdminAction()` on every write path is a convention, not a compile
   check.** → When reviewing new/changed write actions, grep that each one
   logs; when reviewing tests, require an assertion that it was called.
- [ ] **Pure-refactor invariant:** for refactors, total test count unchanged.
      For pure test-addition tasks, count = baseline + exactly the new tests.
      Any other delta needs an explanation you've personally confirmed.

Run the gate on the **state that will actually land**: if the branch isn't
fast-forwardable, cherry-pick onto main in a worktree first and run the gate
there. Mechanics:

```
git worktree add /tmp/review-<task> main
ln -s <repo>/node_modules /tmp/review-<task>/node_modules   # or install
cd /tmp/review-<task> && git cherry-pick <fork>..<branch>   # or: ff-merge
<verify gate>
git push                                                     # from the worktree
git worktree remove /tmp/review-<task>
```

## 6. Landing

- ff-merge when based on current main; cherry-pick otherwise (then delete the
  branch with `-D`, since hashes differ; `-d` suffices for ff-merged ones).
- **Small defects you find: fix at landing**, as your own clearly-attributed
  commit on top of the picked work (e.g. "Review catch: missing key X").
  Bouncing a one-line fix back costs a full round-trip; reserve bounce-backs
  for wrong approaches or guardrail violations.
- Report to the user: verdict, what you checked, the verified numbers (not
  the implementer's), what you fixed, and what remains observable only at
  runtime.

## 7. Wrap up the effort

- Delete executed plan docs; fold durable conventions into the repo's
  permanent docs.
- Append to the implementer's living feedback doc: new miss patterns with the
  concrete incident, AND positive patterns worth reinforcing (catching a
  flagged-imperfect sketch's flaw deserves explicit credit — it's the
  judgment you're trying to grow).
- Surface remaining decisions to the user (gates not yet passed, next slices
  not yet planned). Plan later slices fresh when their turn comes — counts
  drift.
- Leave the shared clone on main, branches cleaned up, no timers running.
