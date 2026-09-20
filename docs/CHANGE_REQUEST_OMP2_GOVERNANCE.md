# Change Request — OMP 2.0 Governance

## Scope

Introduce a lightweight OMP 2.0 governance layer for VNStock and add explicit agent instructions to prevent false-positive diagnoses, especially wrapper/dependency failures such as `spawn vite ENOENT`.

## Proposed changes

1. Add `docs/OMP2_GOVERNANCE.md` covering:
   - roles and authority
   - diagnosis-before-implementation
   - failure-layer classification
   - direct-vs-wrapper verification
   - verification hierarchy
   - human approval gate
   - Jev as an independent/advisory judgment layer when configured
   - dependency provisioning and workspace readiness before agent execution
   - explicit read/write/rename/delete workspace preflight
2. Extend `AGENTS.md` with an OMP 2.0 operating contract.
3. Extend `AGENTS.project.md` so the project-specific agent instructions include the same anti-false-positive rule.

## Environment and workspace readiness contract

Dependencies and workspace access are infrastructure responsibilities, not implementation-agent tasks.

Before an agent receives the workspace, the harness/operator must verify that the actual project root is readable and writable and that basic filesystem operations work: create/write a file, rename it, delete it, create/remove a directory, and access the Git working tree.

For this development environment, `D:\` is configured as a dedicated development drive with inherited Full Control for the user's development account. New project folders inherit that baseline. The harness must still preflight the actual project workspace rather than assuming the drive ACL guarantees every path is usable.

If the preflight fails, classify the workspace as **ENVIRONMENT BLOCKED** and fix it upstream. The implementation agent must not move the repository to a temporary directory, silently substitute another workspace, change host permissions, or enter a repeated filesystem troubleshooting loop.

The agent may use scratch/temp locations for tool-specific temporary artifacts, but the implementation workspace remains the provisioned project root.

## Explicit Vite rule

A `spawn vite ENOENT` message is not a root-cause conclusion. The environment is verified upstream. A `spawn vite ENOENT` message is not a root-cause conclusion and must not trigger an agent dependency/reinstall loop. Only a demonstrated wrapper/process-spawning defect justifies changing `scripts/with-app-env.mjs`.

## Verification record

The Windows workspace baseline was verified during this change request by confirming inherited permissions on `D:\` and a newly created `D:\omp2-new-test` directory. The test workspace supported creation/removal, and inherited permissions were visible on the new directory. This is evidence for the current development machine; the reusable OMP 2.0 rule is the preflight contract above.

## Expected outcome

Agents should spend less time in blind reinstall/edit/retry loops and should leave a clearer evidence trail for human review.

## Approval

**Human owner:** approve / request changes

This CR is intentionally presented as a reviewable change proposal. It must not be merged until approved.
