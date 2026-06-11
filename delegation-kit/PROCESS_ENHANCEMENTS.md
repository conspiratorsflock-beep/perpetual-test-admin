# Delegation Kit — Process Enhancement Proposals

Drawn from two completed rounds in lathe-studio-admin (2026-06-10/11):
the test-repair round (Plans 01–05, 61 failures → 0, 10 production bugs
fixed) and the refactor round (Plans 06–11, security gating + 3 structural
refactors + 50 new tests). Every proposal below traces to a real incident.
Ordered by impact.

## 1. Give the implementer's bookkeeping its own channel (HIGH)

**Incidents:** heartbeat commits landed on work branches in 5 of 11 plans
(dropped at landing each time, twice after explicit feedback); the
in-progress marker was committed directly to main once; the shared
running log produced a real merge conflict (UU) that broke the clone; the
log accumulated duplicate reviewer entries.

**Proposal:** `docs/plans/kimi-running-log.md` becomes UNTRACKED
(gitignored). The implementer's cron writes there freely; the file is
shared state on disk, not in git. Plan completion is signaled by the
committed plan doc's `Status:` line alone (it already carries the
Completion Summary). Heartbeats never touch git; sequencing/merge signals
are read from `git log main`, which cannot conflict.

## 2. Enforce sequencing structurally, not by convention (HIGH)

**Incident:** PLAN_10 was started before PLAN_09 merged, off a base missing
PLAN_09's work, leaving a conflicted clone; required reviewer intervention
and an implementer self-recovery (which, credit due, was executed
correctly).

**Proposal:** the implementer's start checklist gains a hard precondition:
`git merge-base --is-ancestor <previous-plan-tip> main` must be TRUE before
creating the next branch. Plans state the expected predecessor commit
explicitly ("base must include X" — we started doing this informally and it
worked). The reviewer's landing note always names the new main tip.

## 3. The reviewer must check `git branch --show-current` before EVERY commit (HIGH)

**Incidents:** the reviewer (me) committed onto Kimi's in-flight branch
twice — the shared clone's branch changes underneath you between ticks.
Recovery was clean both times (mixed reset + cherry-pick via worktree) but
entirely avoidable.

**Proposal:** reviewer rule, now in the playbook: all reviewer commits
happen in a dedicated worktree pinned to main, never in the shared clone.
The shared clone belongs to the implementer, full stop.

## 4. Working tree ≠ branch tip: always verify before running the gate (MEDIUM)

**Incident:** a reviewer gate run silently executed against the WRONG
file state (PLAN_09 review saw 328 tests instead of 346) because the clone
sat on a different branch than expected. Caught because the implementer's
reported number didn't match.

**Proposal:** the reviewer's gate procedure starts with
`git rev-parse HEAD == <branch tip>` and `git status --short` emptiness
(modulo generated files). Implementer-reported full-suite numbers are
mandatory precisely so a mismatch is detectable — per-file numbers are
banned in reports (this bit us once).

## 5. Plan docs as the report vehicle worked — formalize it (MEDIUM)

**Observation:** the Completion Summary embedded in the plan doc (started
spontaneously at PLAN_06) was easier to review than log-only reports and
travels with the branch. **Proposal:** make it the standard — the plan
template gains a `## Completion Summary` skeleton; the running log keeps
only one-line status changes.

## 6. Reviewer-held runtime gates earn their keep — name them in every plan (MEDIUM)

**Observation:** the two runtime gates (no-Clerk-keys boot; barrel
server-action round-trip via headless browser) caught nothing this time but
DISPROVED a load-bearing assumption (lazy require ≠ env-validation dodge)
and proved another (barrel wiring). Out-of-band verification of
NOT-verified items found the round's biggest bug (live-DB schema drift that
broke the Help Desk).

**Proposal:** every plan template includes an explicit "Reviewer-held
gates" section, even when empty — the act of writing "none" forces the
planner to ask what tests structurally can't see.

## 7. Class sweeps at landing should be budgeted, not improvised (LOW)

**Observation:** three landings included reviewer class-sweeps (audit-log
gaps ×4, swallowed-error enrichment ×4 + dashboard, dead imports ×21). All
were small, but they're unplanned work at the riskiest moment (merge time).
**Proposal:** when the implementer reports a class instance, the reviewer
may instead spin a micro-plan for the sweep when it exceeds ~5 sites.

## 8. Permission boundaries that worked — keep them (INFO)

Main-branch pushes and live-DB migrations both required explicit user
approval, and both gates fired correctly during the rounds (a migration was
queued as blocked until the user approved it; the approved version fixed a
production-broken Help Desk). The kit should document these as standing
gates: the reviewer NEVER applies schema changes or deletes published
branches without same-conversation user approval.
