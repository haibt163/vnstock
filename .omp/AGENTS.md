# vnstock — OMP 2.0 Project Context

## Project

vnstock is a Vietnamese stock-data application.

Repository:
https://github.com/haibt163/vnstock

Default branch:
main

## Runtime

- Node.js
- npm
- Vite

## Standard verification

Run:

1. npm run typecheck
2. npm run lint
3. npm test
4. npm run build

Do not use the development server as a generic smoke test.

## Architecture

Data-provider cascade:

1. VPS — primary
2. Yahoo — delayed fallback
3. DEMO — final fallback

SSI may be used for legitimate realtime access when properly credentialed.

## Project documentation

Before changing provider behavior, inspect:

- docs/PROJECT_STATUS.md
- docs/DATA_PROVIDERS.md
- AGENTS.md
- AGENTS.project.md

## Project-specific engineering constraints

Preserve the existing provider cascade unless the task explicitly changes it.

Do not introduce unauthenticated or undocumented realtime data sources.

Use existing validation and error-handling patterns.

## Change discipline

Keep changes minimal and task-scoped.
