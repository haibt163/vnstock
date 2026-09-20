# OMP 2.0 Governance — VNStock

## Purpose

OMP 2.0 is the project's governance layer for agent-driven engineering. It does not replace the application's runtime checks, tests, or human review. Its job is to keep implementation work evidence-driven, auditable, and resistant to false-positive diagnoses.

## Dependency provisioning and standard smoke gate

Agents receive a pre-provisioned workspace. The harness/operator installs dependencies from the lockfile before the agent starts (for npm projects, use npm ci), confirms the expected runtime/package manager, and confirms the standard gates can start.

Once handed over, agents do not routinely run npm install, npm ci, npx package acquisition, or dependency repair. If the workspace is missing a required dependency, report ENVIRONMENT BLOCKED and stop that line of investigation. Reinstall only when the task explicitly changes dependencies or the Chief Engineer requests it.

The default implementation smoke gate is exactly:

1. npm run typecheck
2. npm run lint
3. npm test
4. npm run build

All four should pass before handoff. The dev server is NOT part of the default smoke gate. Do not make agents start npm run dev, vite dev, npx vite, or equivalent merely to prove a code change. Vite treats dev and production build as separate modes, and the build is the production compilation path. citeturn0search1turn0search2

For VNStock, npm run build is the project production-build gate. Vercel separately executes the configured build during deployment. citeturn0search3turn0search5

Browser/runtime checks are exception-based: use them only for a UI/runtime-specific investigation, deployment verification, or when the Chief Engineer explicitly requests them. They must never become an open-ended port/server troubleshooting exercise.

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

For this project, npm run dev intentionally launches Vite through scripts/with-app-env.mjs.

A spawn vite ENOENT message is not by itself proof that the wrapper is defective. Under OMP 2.0, dependency provisioning happens upstream before the agent receives the workspace. An agent should therefore NOT begin an install/reinstall loop because a dev server cannot start.

If the task does not require runtime/browser verification, leave the dev server alone and use the four standard smoke gates.

If runtime investigation is explicitly required, the harness/operator first verifies the provisioned environment. Only then should the agent investigate wrapper/process-spawning behavior.

Do not use package-acquiring npx vite as a routine diagnostic because it can introduce a different Vite installation and obscure the locked dependency state.

Never enter an install/reinstall/edit/retry loop without new evidence.

General rule: verify the environment once upstream; diagnose application code downstream.

## Verification hierarchy

Use the narrowest reliable evidence first, then widen:

**targeted evidence → typecheck/lint/test/build → optional runtime/browser verification → deployment verification**

A green wrapper command is not equivalent to a working application. A green HTTP status is not equivalent to a rendered UI.

## OMP 2.0 agent operating instructions

Before editing:

- Read `AGENTS.md`, `AGENTS.project.md`, relevant project documentation, and the current implementation.
- State the suspected failure layer and the evidence supporting it.
- Do not spend the task budget provisioning dependencies unless explicitly assigned to do so.
- Prefer one controlled experiment that can falsify the hypothesis over multiple speculative edits.

While editing:

- Make the smallest change that addresses the demonstrated defect.
- Preserve existing provider/data provenance and documented caveats.
- Do not rewrite architecture merely to remove an error message.
- Do not add dependencies unless the task requires them and the change is approved.
- Do not repeatedly reinstall, regenerate, reset infrastructure, or start/stop dev servers without identifying what changed.

Before handoff:

- Report files changed.
- Report the four standard smoke-gate results.
- Report any optional runtime/deployment verification separately.
- Distinguish **verified**, **inferred**, **unverified**, and **environment-blocked** findings.
- Record known environmental/tooling limitations separately from application defects.
- Leave the repository in a reviewable state.

## Human approval gate

OMP 2.0 treats the human owner as the final change authority.

A proposed implementation should move through:

`observe → diagnose → propose → CR/PR → human review → implement/merge → verify → record`

No agent should interpret an unreviewed CR/PR as approval.

## Relationship to current VNStock documentation

This governance file complements, rather than replaces, the existing App Builder contract in `AGENTS.md`, the project instructions in `AGENTS.project.md`, and the project evidence recorded in `docs/PROJECT_STATUS.md`.
