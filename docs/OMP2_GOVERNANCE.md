# OMP 2.0 Governance — VNStock

## Purpose

OMP 2.0 is the project's governance layer for agent-driven engineering. It does not replace the application's runtime checks, tests, or human review. Its job is to keep implementation work evidence-driven, auditable, and resistant to false-positive diagnoses.

## Authority and roles

- **Project Owner:** Human owner of VNStock.
- **Chief Engineer:** Owns architecture, diagnosis, implementation scope, and release recommendations.
- **Implementation Agent:** Executes an approved task and reports evidence. It must not convert an error string into a root-cause claim without testing the failure path.
- **Judgment Layer:** Jev may be used as an independent judgment layer where explicitly configured by OMP 2.0. Jev is advisory; it does not replace tests, runtime evidence, or human approval.

## Change control

1. Work from the current repository state and the task's stated source of truth.
2. Separate diagnosis from implementation.
3. For risky or ambiguous changes, prepare a CR/PR for human review rather than changing `main` directly.
4. Do not merge or declare a release solely because an agent reports success.
5. Record verification evidence for build, typecheck, tests, and runtime/browser checks that are relevant to the change.

## Failure-path protocol

An error message is evidence, not a diagnosis.

For any failure:

1. Capture the exact command and error.
2. Identify the failing layer: source code, dependency/install state, executable resolution, wrapper/process spawning, framework/plugin, network/provider, or runtime/browser.
3. Reproduce with the narrowest independent test that distinguishes those layers.
4. Compare direct execution with wrapped execution when a wrapper is involved.
5. Only change code after evidence establishes that the defect is in code.
6. After a fix, rerun the smallest confirming test, then the relevant broader gates.
7. Stop repeated retries when the evidence points to environment/tooling noise; document the finding instead of looping.

### Vite/ENOENT canonical example

For this project:

- `npm run dev` invokes `node scripts/with-app-env.mjs vite dev ...`.
- A `spawn vite ENOENT` message does **not** by itself prove `with-app-env.mjs` is defective.
- First establish whether the local Vite executable exists and whether direct Vite invocation works.
- Do not use `npx vite` as the first diagnostic if the intent is to test the project's locked dependency tree, because `npx` can offer to download a missing package and mask the local dependency state.
- Preferred diagnostic order:
  1. `npm ci`
  2. verify `node_modules/.bin/vite`
  3. run the local Vite executable directly
  4. run `npm run dev`
  5. compare results
- If direct Vite works but the npm wrapper fails with `spawn vite ENOENT`, then investigate executable resolution/process-spawning in the wrapper.
- If direct Vite also fails, treat the wrapper as unproven and diagnose dependency/install state first.
- Never enter an install/reinstall loop without new evidence.

This is a general rule: when a wrapper launches a child process, independently verify the child before modifying the wrapper.

## Verification hierarchy

Use the narrowest reliable evidence first, then widen:

**unit/fixture evidence → targeted integration → typecheck/lint → production build → browser/runtime verification → deployment verification**

A green wrapper command is not equivalent to a working application. A green HTTP status is not equivalent to a rendered UI.

## OMP 2.0 agent operating instructions

Before editing:

- Read `AGENTS.md`, `AGENTS.project.md`, relevant project documentation, and the current implementation.
- State the suspected failure layer and the evidence supporting it.
- Prefer one controlled experiment that can falsify the hypothesis over multiple speculative edits.

While editing:

- Make the smallest change that addresses the demonstrated defect.
- Preserve existing provider/data provenance and documented caveats.
- Do not rewrite architecture merely to remove an error message.
- Do not add dependencies when an existing project dependency is sufficient.
- Do not repeatedly reinstall, regenerate, or reset infrastructure without identifying what changed.

Before handoff:

- Report files changed.
- Report commands run and their outcomes.
- Distinguish **verified**, **inferred**, and **unverified** findings.
- Record known environmental/tooling limitations separately from application defects.
- Leave the repository in a reviewable state.

## Human approval gate

OMP 2.0 treats the human owner as the final change authority.

A proposed implementation should move through:

`observe → diagnose → propose → CR/PR → human review → implement/merge → verify → record`

No agent should interpret an unreviewed CR/PR as approval.

## Relationship to current VNStock documentation

This governance file complements, rather than replaces, the existing App Builder contract in `AGENTS.md`, the project instructions in `AGENTS.project.md`, and the project evidence recorded in `docs/PROJECT_STATUS.md`.
