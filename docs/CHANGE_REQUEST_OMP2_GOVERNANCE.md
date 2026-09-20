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
2. Extend `AGENTS.md` with an OMP 2.0 operating contract.
3. Extend `AGENTS.project.md` so the project-specific agent instructions include the same anti-false-positive rule.

## Explicit Vite rule

A `spawn vite ENOENT` message is not a root-cause conclusion. The environment is verified upstream. A `spawn vite ENOENT` message is not a root-cause conclusion and must not trigger an agent dependency/reinstall loop. Only a demonstrated wrapper/process-spawning defect justifies changing `scripts/with-app-env.mjs`.

## Expected outcome

Agents should spend less time in blind reinstall/edit/retry loops and should leave a clearer evidence trail for human review.

## Approval

**Human owner:** approve / request changes

This CR is intentionally presented as a reviewable change proposal. It must not be merged until approved.
