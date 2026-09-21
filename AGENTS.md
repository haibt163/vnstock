# vnstock — Repository Guide

This repository is a Vietnamese stock-data application.

Repository:
https://github.com/haibt163/vnstock

Default branch:
main

## OMP 2.0 project context

The canonical OMP 2.0 project context lives in:

`.omp/AGENTS.md`

Use that file for agent-facing project instructions. Global OMP 2.0 operating rules come from the user's OMP installation.

## Project documentation

Before changing market-data behavior, inspect:

- `docs/PROJECT_STATUS.md`
- `docs/DATA_PROVIDERS.md`

These documents record the current verified project state, provider architecture, known limitations, and prior investigations.

## Runtime

- Node.js
- npm
- Vite

## Verification

The normal project verification gate is:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`

Use runtime/browser checks only when the task requires runtime, UI, deployment, or browser-specific evidence.

## Data-provider architecture

Current cascade:

1. VPS — primary near-live board
2. Yahoo Finance — delayed fallback
3. DEMO — final fallback

SSI FastConnect is the documented legitimate realtime upgrade path when properly credentialed, but it is not the current unauthenticated quote source.

Do not represent an undocumented or unauthenticated source as a licensed realtime feed.

## Engineering conventions

Prefer existing project patterns and validation/error-handling boundaries over parallel abstractions.

Keep changes minimal and task-scoped.

Meaningful provider or architecture changes should be reflected in the appropriate `docs/` documentation.

This file is a repository compatibility guide; the canonical OMP project contract is `.omp/AGENTS.md`.
