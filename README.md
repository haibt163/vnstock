# VNEdge

VNEdge is a Vietnamese stock-market screening and analytical web application.
It provides a compact market dashboard, exchange-aware screening, stock detail
pages, and methodology/source transparency.

> **Important:** VNEdge is an analytical tool, not a stock exchange, broker,
> or investment adviser. Market data shown by the application is subject to
> provider availability and the documented usage/provenance limitations.

## Data architecture

### Quotes

The current quote cascade is:

`VPS public price board → Yahoo Finance delayed *.VN → DEMO`

**VPS** is the primary near-live quote source used by the application. It is a
public broker board, not an official HOSE/HNX exchange feed, and its use in
third-party applications remains a documented terms/usage caveat.

**Yahoo Finance** is a clearly labelled delayed fallback. It is not silently
mixed into gaps in a VPS snapshot.

**DEMO** is used only when the live quote paths are unavailable according to
the application fallback logic.

See [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) for provider research,
freshness, field provenance, and usage caveats.

### Listed universe

The application dynamically discovers the listed-equity universe from VPS
board lists:

- HOSE: `getlistckindex/hose`
- HNX: `getlistckindex/hnx`
- UPCoM: `getlistckindex/upcom`

The universe is not hardcoded to the former 69-name sample.

A listed security and its current quote are separate concepts. A symbol can
remain in the browseable universe when VPS has no usable last print; in that
case quote fields remain unavailable rather than being filled with zero or
synthetic values.

During the 2026-09-29 verification pass, the observed universe was:

| Exchange | Listed | With a usable last print |
|---|---:|---:|
| HOSE | 405 | 344 |
| HNX | 299 | 166 |
| UPCoM | 818 | 246 |
| **Total** | **1,522** | **756** |

These figures are an observed verification snapshot, not a permanent market
count.

### Metadata

The established 69-name curated set retains its existing company/sector
metadata where available. Newly discovered names use source-supported VPS
master names and may have unavailable sector metadata.

VN30 membership is maintained separately and is not inferred from the total
listed universe.

## Routes

- `/` — market dashboard
- `/screener` — flagship screener with URL-synced filters, pagination, and
  column visibility
- `/market` — index overview
- `/stock/:symbol` — stock detail, historical chart, and derived indicators
- `/methodology` — data sources, universe rules, and field provenance

## Language and theme

Vietnamese is the default language, with English available.

System / light / dark themes are supported and persisted locally.

## Setup

Prerequisites: Node.js and npm.

```bash
npm install
npm run dev
```

Do not commit secrets. Use `.env.example` only to document supported
environment-variable names.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Engineering governance

This repository (`haibt163/vnstock`) powers the VNEdge product and follows the project's OMP 2.0 engineering governance.

Start with:

- [AGENTS.md](AGENTS.md) — repository-wide agent contract
- [AGENTS.project.md](AGENTS.project.md) — VNStock-specific project rules
- [docs/OMP2_GOVERNANCE.md](docs/OMP2_GOVERNANCE.md) — project OMP 2.0 governance
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — current verified status
- [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) — provider evidence and
  caveats

## Current limitations

- VPS is not an official exchange feed and third-party usage rights remain
  unclear.
- VPS can occasionally exhibit slow responses; the application uses bounded
  timeouts/caching and preserves received batches when appropriate.
- A symbol without a current last print has no fabricated quote.
- Sector metadata is not complete for the dynamically discovered universe.
- Yahoo delayed fallback does not provide full HNX/UPCoM quote coverage.
- Credentialed SSI FastConnect remains a documented option but is not the
  current unauthenticated quote source.

## Contributing / review

Work on a feature branch, run the verification gate, and submit a PR for
review. Do not merge directly to `main`.
