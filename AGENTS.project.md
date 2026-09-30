# vnstock — Project Instructions

## 1. Project Identity

**VNStock**

Repository: `haibt163/vnstock`

Canonical integration branch: `main`

VNStock is a Vietnamese stock-market screening and analytical web application.
It is not an exchange, broker, or investment-advisory service.

## 2. Runtime and Stack

The current application is a TypeScript / React application using:

- React
- TanStack Start / Router
- Vite
- Tailwind CSS
- Zod
- Node.js / npm

Canonical scripts and dependencies are defined by `package.json`.

Do not replace the existing framework or architecture to solve a local task.

## 3. Market-Data Architecture

Current quote cascade:

`VPS public price board → Yahoo Finance delayed *.VN → DEMO`

VPS remains the primary near-live quote source.

Yahoo is explicitly DELAYED and is not a substitute for official exchange
realtime data.

Do not add or represent KBS, VCI, MSN, or other undocumented/publicly
accessible broker endpoints as realtime providers without explicit approval,
evidence, and provider/usage review.

SSI FastConnect remains a documented credentialed option, not the current
unauthenticated quote source.

## 4. Universe Model

The listed-equity universe is dynamically discovered from the VPS board lists:

- `getlistckindex/hose`
- `getlistckindex/hnx`
- `getlistckindex/upcom`

The application must distinguish:

- listed security identity;
- current quote availability.

A listed security with no usable last print may remain browseable with null
quote fields. Never convert missing quotes to fabricated zero values.

The observed universe size is a runtime observation, not a hardcoded contract.

VN30 membership is a separate data set and must not be inferred from the full
listed universe.

## 5. Metadata and Provenance

Preserve the curated metadata for the established 69-name set where available.
For newly discovered names, use only metadata supported by an actual source.
Do not invent sectors, company names, VN30 membership, or valuation inputs.

Keep source-derived, derived, and unavailable fields distinguishable.

## 6. VPS Implementation Boundary

The existing VPS parser/schema and its nullable-field handling are sensitive
because they previously contained a real provider-schema failure.

Do not refactor `src/lib/market/vps.ts` casually. Change it only when the task
directly requires it and evidence shows the change belongs there.

Do not silently mix Yahoo data into gaps in a VPS board snapshot.

## 7. Performance and Caching

Universe discovery and quote hydration use separate caches.

Avoid giant unbounded quote requests. Current implementation uses bounded
batches and a short quote cache; preserve that evidence-based approach unless
new measurements justify a change.

## 8. UI / Localization

Vietnamese is the default language, with English available.

Do not redesign the UI, branding, theme, or localization as part of a scoped
market-data change.

Screener exchange filters must remain available for ALL, HOSE, HNX, and UPCoM.

## 9. Documentation

Before changing provider or universe behavior, inspect:

- `docs/PROJECT_STATUS.md`
- `docs/DATA_PROVIDERS.md`

Update them when current behavior changes, while preserving historical evidence.

## 10. Verification and Review

Default verification gate:

`npm run typecheck`
`npm run lint`
`npm test`
`npm run build`

Run targeted browser/runtime checks when UI or runtime behavior is part of the
task.

All substantive work must remain reviewable on a feature branch and be handed
off through the repository's PR/approval process.
