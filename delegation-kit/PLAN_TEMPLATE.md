# <Effort> — Task: <one-line scope>
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started <· **Sequence:** start AFTER <other task> merges, if ordered>

<2–4 sentences: which files, what the task is, and whether it is
**confirm-and-lock** (tests/docs only; source must not change) or **change**.
If a prior incident motivates this task, say so in one line — implementers
execute better when they know what the work prevents.>

<If merging requires a human/runtime observation:>
**PRECONDITION (user gate, not Kimi's):** <what the user must confirm>.
Kimi may implement immediately; the REVIEWER holds the merge until confirmed.

## Inventory (verified <date> — verify again, then work through)
- <file> (<count>) — <what's there; any site needing special treatment>
- <file> (<count>) — ...
- EXCLUDE: <files that look in-scope but aren't, and why>

## What MUST be true / asserted
- <the load-bearing properties a reviewer will check, as testable statements>
- <security/scope invariants: auth-before-action, tenant/ownership scoping,
  wire-values-not-display-strings, semantics byte-identical for guarded files>
- <the repo's verify gate: suite green, typecheck clean, coverage ≥ floor,
  static gates clean>
- <invariant for the task type: pure refactor → test count unchanged;
  pure test-addition → count = baseline + new; anything else explained>

## Branch workflow
1. Create `kimi/<short-task>` off latest main.
2. One commit per file for multi-file work, + this plan doc. No `git add -A`.
3. Verify gate green after EVERY commit, not just the last.
4. Report branch + summary (format in KIMI_IMPLEMENTER_GUIDE). Do NOT merge.

## Guardrails
- <the specific traps: historical commits that made deliberate tradeoffs,
  near-twin names, enum values that look like labels, files where "types
  only" must mean byte-identical behavior>
- <for deletions: per-item whole-repo verification, exact qualified names>
- <for any sketch you provide: mark it "starting point — get it right against
  the real <thing>; if it resists, prefer a small honest fallback over a
  weakened assertion">
- Stuck = leave a `// CAST-DEBT:`-style marker + reason + report it. Never
  widen types or weaken assertions to get green.

## Report back to Claude
- Branch + per-file commits; work done vs deferred (count + reasons); real
  findings beyond the spec (file:line, consequence, action taken); gate
  numbers (suite count + exit, typecheck, coverage); **verified vs NOT
  verified** — name explicitly what your tests structurally cannot prove
  about this change (the reviewer re-verifies that list out-of-band).
