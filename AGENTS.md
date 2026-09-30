# vnstock — Repository Agent Contract

## Purpose

This file is the repository-wide, harness-neutral contract for AI and human
engineering agents working on VNStock.

Project-specific rules belong in `AGENTS.project.md`.
Harness-specific operating rules belong in the relevant harness directory.
Detailed procedures and historical evidence remain under `docs/`.

## 1. Read Before Substantive Work

Before substantive work:

1. inspect the current Git state;
2. read `AGENTS.project.md`;
3. read relevant `docs/` governance and project-status documents;
4. inspect the relevant implementation;
5. inspect relevant tests and verification scripts.

Do not treat prior conversation, model reports, or handoffs as authoritative
when the repository can provide direct evidence.

## 2. Task Modes

### Read-only audit / investigation

Inspect and report findings without modifying application code unless explicitly
authorized.

### Implementation

Modify only the files and surfaces necessary for the authorized task.
Normal implementation work should use a dedicated feature branch or worktree.

## 3. Think Before Coding

- State assumptions explicitly before implementing on top of them.
- Do not silently choose between materially different interpretations.
- Prefer the simplest correct approach.
- If the task or current implementation is unclear, inspect the repository and
  identify the ambiguity before making a consequential change.

## 4. Scope Discipline

Prefer the smallest correct change.

Do not add unrelated refactors, dependency upgrades, aesthetic rewrites, or
architecture changes to a scoped task unless required or explicitly authorized.

When an existing project mechanism already solves the need, prefer it over a
parallel mechanism.

Every changed line should trace to the authorized task. Clean up imports or
symbols made unused by your own change, but do not fix unrelated pre-existing
issues during a scoped task.

## 5. Evidence-Driven Execution

Prefer checkable success criteria over assertions.

For substantive work, use the project's verification gate:

1. `npm run typecheck` → TypeScript passes
2. `npm run lint` → lint passes
3. `npm test` → test suite passes
4. `npm run build` → production build passes

Runtime/browser checks are additional evidence when the task affects runtime,
UI, deployment, or browser behavior.

Never claim a command passed without executing it.

## 6. Data, Provider, and Provenance Safety

VNStock is a market-data application. Treat provider provenance, freshness,
authentication, licensing/usage constraints, and derived-vs-source fields as
explicit boundaries.

Never:

- commit credentials or secrets;
- bypass authentication, rate limits, CAPTCHAs, or protected endpoints;
- represent an undocumented source as a licensed realtime feed;
- fabricate prices, company metadata, exchange membership, or market status;
- silently mix data from different freshness classes;
- replace source evidence with invented data.

The documented provider cascade is:

`VPS public board → Yahoo Finance delayed → DEMO`

Do not change that cascade without explicit authorization and evidence.

The VPS board is a public broker board, not an official HOSE/HNX exchange
feed. Its third-party usage rights remain a documented caveat.

## 7. Documentation

Keep durable project knowledge in repository-visible documentation.

When current behavior changes:

- update current documentation where useful;
- preserve historical audits and evidence;
- do not rewrite historical evidence merely to make later behavior look
  continuous;
- avoid duplicating detailed procedures unnecessarily.

Key project documents include:

- `docs/PROJECT_STATUS.md`
- `docs/DATA_PROVIDERS.md`
- `docs/OMP2_GOVERNANCE.md`

## 8. Failure-Path Discipline

An error message is evidence, not a diagnosis.

For a failure:

1. capture the exact command/error;
2. identify the failing layer;
3. reproduce with the narrowest useful experiment;
4. change code only after evidence points to code;
5. rerun the smallest confirming test, then the broader relevant gates;
6. stop retry loops when evidence points to environment/tooling noise.

Do not use blind install/reinstall/edit/retry loops.

## 9. Git and Review Boundary

`main` is the canonical integration branch.

Normal implementation work should use a dedicated feature branch/worktree.

Implementation agents must not bypass the project's review and approval process.

Passing tests do not authorize a merge.

The Project Owner / active Chief Engineer holds the approval decision. The
author of a change does not self-approve it. OMP is an implementation lane
without merge authority. Claude Code and Codex CLI/App are peer merge-capable
implementation lanes under the project's governance; ChatGPT and Claude Chat
are peer Chief Engineer review lanes.

Do not push directly to `main` for normal feature work.
Do not merge an unapproved PR.

## 10. Completion

A substantive task handoff should state:

- task and scope;
- implementation/findings;
- exact files changed;
- verification results;
- relevant runtime/browser evidence;
- remaining limitations;
- Git branch/state;
- handoff status.

Report certainty according to evidence: VERIFIED, UNVERIFIED, FAILED, or
ENVIRONMENT BLOCKED.
