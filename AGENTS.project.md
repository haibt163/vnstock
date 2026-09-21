# vnstock — Project Instructions

The canonical agent-facing project context is:

`.omp/AGENTS.md`

Global OMP 2.0 engineering governance is supplied by the user's OMP installation. Do not duplicate the global agent contract here.

Project-specific requirements:

- Preserve the documented VPS → Yahoo delayed → DEMO provider cascade unless the task explicitly changes it.
- Do not introduce unauthenticated or undocumented realtime data sources.
- Use existing validation and error-handling patterns.
- Consult `docs/PROJECT_STATUS.md` and `docs/DATA_PROVIDERS.md` before changing provider behavior.
- Treat documented project facts and verified runtime/provider evidence as the basis for implementation decisions.

This file exists as a compatibility/project-instructions pointer for tooling that recognizes `AGENTS.project.md`. It is not a second OMP 2.0 constitution.
