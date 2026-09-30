# VNStock reviewed market-universe patch

Source baseline: clean main from the uploaded vnstock.zip.
Source implementation: uploaded Grok workspace.

Included: only the application files required for the full HOSE/HNX/UPCoM
universe + nullable/unquoted listings behavior, plus DATA_PROVIDERS.md and
PROJECT_STATUS.md.

Intentionally excluded:
- AGENTS.md
- AGENTS.project.md
- README.md
  These are handled by the separate documentation PR (#2).
- scripts/with-app-env.mjs
  Grok's workspace regressed the Windows wrapper; keep the main version.
- src/lib/app-data/client.server.ts
  Unrelated Grok sandbox change.
- package-lock.json
  No implementation need; keep main.
- .grok/, .vercel/, generated screenshots/assets, Grok helper scripts
  and other sandbox/generated artifacts.

Reviewed files:
- src/lib/market/live-provider.ts
- src/lib/market/market.test.ts
- src/lib/market/normalize.ts
- src/lib/market/types.ts
- src/lib/market/universe.ts
- src/lib/market/vps.ts
- src/routes/methodology.tsx
- src/routes/screener.tsx
- src/components/common/signed-value.tsx
- src/components/screener/screener-table.tsx
- src/components/screener/screener-toolbar.tsx
- src/lib/i18n/messages.ts
- src/routes/index.tsx
- src/routes/stock.$symbol.tsx
- src/lib/market/quote-batch.ts
- src/lib/market/universe-feed.ts
- docs/PROJECT_STATUS.md
- docs/DATA_PROVIDERS.md
