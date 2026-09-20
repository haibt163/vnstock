This conversation belongs to a Grok project. The project's files are mounted at `/workspace/artifacts` — look there for user-provided sources before concluding the workspace has no project files. Files written there persist to the project across conversations.

---

## OMP 2.0 project governance

VNStock follows the OMP 2.0 evidence-first workflow in
`docs/OMP2_GOVERNANCE.md`.

Treat failures as hypotheses to test, not instructions to edit code. Before
changing infrastructure or source, classify the failure layer and run a narrow
experiment that can distinguish competing explanations.

For wrapper/process errors, independently verify the child command first. In
particular, `spawn vite ENOENT` must be checked as a local-dependency/executable
resolution problem before any change to `scripts/with-app-env.mjs`. Use the already-provisioned dependency state. Only when runtime debugging is explicitly required should the agent verify the local Vite binary and then test `npm run dev`. Do not use an `npx` command that may download a new package as the primary missing-binary diagnostic.

Do not enter repetitive reinstall/edit/retry loops without new evidence.
Record what was verified versus inferred. Non-trivial changes should be
reviewable through a CR/PR before they reach `main`; human approval remains
the final change gate.


---

## OMP 2.0 project execution contract

VNStock follows docs/OMP2_GOVERNANCE.md.

Dependencies are provisioned before an agent receives the workspace. The agent should not run npm install, npm ci, npx package acquisition, or dependency repair unless explicitly assigned. Missing dependencies are reported as **ENVIRONMENT BLOCKED**.

The normal smoke gate is only: npm run typecheck, npm run lint, npm test, and npm run build. Do not start npm run dev or vite dev as a routine verification step. Runtime/browser checks are exception-based and should be isolated from the normal implementation loop.

A spawn vite ENOENT message is not a diagnosis. Do not modify scripts/with-app-env.mjs or enter dependency loops without evidence establishing a wrapper/process defect. If runtime debugging is required, verify the prepared environment upstream first.

Non-trivial changes should be presented as a CR/PR before reaching main. Human approval is the final change gate.


## OMP 2.0 workspace readiness contract

The harness/operator provisions and preflights the workspace before the agent starts. Verify the actual project root is readable and writable, including create/write/rename/delete file operations, create/remove directory operations, and normal Git working-tree access. A failed preflight is **ENVIRONMENT BLOCKED**.

For this development environment, `D:\` is a dedicated development drive with inherited Full Control for the user's development account, so new project folders inherit the baseline. Agents must not change host permissions or silently move the implementation workspace to `%TEMP%`, another drive, or another directory to work around access problems.

Scratch/temp locations are allowed only for tool-specific temporary artifacts. The provisioned project root remains the implementation workspace.
