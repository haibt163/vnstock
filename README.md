# VNEdge

VNEdge is the product brand for the `haibt163/vnstock` Vietnamese stock-market
screening and analytical web application.

The repository name remains **vnstock**; the public-facing application brand
is **VNEdge**.

> **Important:** VNEdge is an analytical tool, not a stock exchange, broker,
> or investment adviser. Market data is subject to provider availability and
> the documented provenance/usage limitations.

## Data architecture

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

## Listed universe

The application dynamically discovers the listed-equity universe from VPS
board lists:

- HOSE: `getlistckindex/hose`
- HNX: `getlistckindex/hnx`
- UPCoM: `getlistckindex/upcom`

The universe is not hardcoded to the former 69-name sample.

A listed security and its current quote are separate concepts. A symbol can
remain in the browseable universe when VPS has no usable last print; quote
fields remain unavailable rather than being filled with zero or synthetic data.

See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for current verified
project state.

## Branding and SEO assets

The application ships a responsive VNEdge favicon/PWA asset set, Apple
touch icon, web manifest, Open Graph image, `robots.txt`, and `sitemap.xml`.
The site metadata exposes canonical, Open Graph, Twitter-card, and mobile
web-app metadata.

## Routes

- `/` — market dashboard
- `/screener` — flagship screener
- `/market` — index overview
- `/stock/:symbol` — stock detail and history
- `/methodology` — data sources and methodology

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

This repository follows the project's OMP 2.0 engineering governance.

Start with:

- [AGENTS.md](AGENTS.md) — repository-wide agent contract
- [AGENTS.project.md](AGENTS.project.md) — VNEdge/VNStock project rules
- [docs/OMP2_GOVERNANCE.md](docs/OMP2_GOVERNANCE.md) — project OMP 2.0 governance
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — current verified status
- [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) — provider evidence and caveats
