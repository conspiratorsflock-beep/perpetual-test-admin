# Delegation Kit — Claude ↔ Kimi pair workflow

A reusable harness for running large, decomposable engineering efforts
(refactors, test-suite overhauls, migrations, hardening sweeps) with two AI
agents in defined roles:

- **Kimi (implementer)** — executes one small, precisely-specified task at a
  time on its own branch. Tunnel vision is a feature: it stops scope creep and
  keeps diffs reviewable.
- **Claude (reviewer/orchestrator)** — surveys the codebase, writes the plan
  docs, reviews every branch line-by-line, independently re-verifies claims,
  merges, and fixes small defects at landing.
- **You (the user)** — set direction, signal when a branch is ready for
  review, and hold any gates that require human/runtime observation (e.g.
  "confirm the staging console is clean before we enforce this header").

Proven on a prior project: a 4-plan round (security-header repair, a typed-
client refactor, test-breadth expansion, an i18n extraction) landed with zero
regressions, surfaced six latent production bugs the test suite could not see,
and required exactly one reviewer fix at landing.

## Files

| File | Audience | Contents |
|------|----------|----------|
| `CLAUDE_REVIEWER_PLAYBOOK.md` | Claude | Survey → plan → review → verify → merge → wrap-up workflow |
| `KIMI_IMPLEMENTER_GUIDE.md` | Kimi | Branch/commit discipline, the five habits, reporting format |
| `PLAN_TEMPLATE.md` | Claude (writes), Kimi (executes) | The per-task plan-doc skeleton |

## Bootstrapping this kit in a new repo

Do these once, before the first plan. Most failures in this workflow come from
skipping step 2.

1. **Create `docs/plans/`** (or equivalent). Plan docs live there. Convention:
   a plan is left **uncommitted** by the reviewer; the implementer commits it
   with its branch; the reviewer **deletes it after it executes** (folding any
   durable learnings into the repo's permanent docs). Executed plans rot —
   don't let them accumulate.

2. **Define the verify gate for THIS repo** and write it into the playbook
   copy. The gate is the fixed set of commands that must pass before any
   merge. Typical shape:
   - full test suite (exact command, expected-green baseline count)
   - type check (e.g. `tsc --noEmit`)
   - lint, if it's enforced
   - coverage threshold, if ratcheted (state the floor)
   - any repo-specific static gates (schema scanners, naming-convention
     checks, dependency rules)

3. **Name the mock-invisible bug classes for this stack.** Every codebase has
   bugs its tests structurally cannot catch — mocked externals, environment
   differences between local and deploy, schema drift, untyped string lookups
   against runtime systems. List them explicitly, and for each, the
   out-of-band verification that DOES catch it (run the query against the real
   database; install with the deploy flags; curl the real endpoint). Both
   agents' docs refer to this list. Examples from the prior project: mocked
   ORM clients hid wrong column names and wrong relation shapes; the deploy
   environment installed without workspaces so locally-resolving types broke
   the build; translation-key lookups had no compile-time existence check.

4. **Set the operating agreement** (defaults that worked; adjust per repo):
   - **Sequential, shared clone.** Implementer and reviewer take turns in one
     working tree; the reviewer uses **git worktrees** for anything that needs
     a checkout while the implementer is mid-task.
   - **Event-driven review triggering.** The user (or the implementer's
     report) signals readiness. No polling timers.
   - **Reviewer merges; implementer never does.** Straight-merge after verify
     for routine work; escalate to a PR only for large/risky changes
     (schema-touching, security-sensitive, broad rewrites).
   - **Implementer commits its own work** with clear messages — they're part
     of the review surface.

5. **Start a living feedback doc for the implementer** (see the section at the
   end of `KIMI_IMPLEMENTER_GUIDE.md`). Append patterns — misses AND wins —
   after each review. It measurably improves later rounds.
