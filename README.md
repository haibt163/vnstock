# VNStock

Bộ lọc chứng khoán Việt Nam. Giao diện terminal tối làm mặc định, theme sáng được thiết kế riêng.

Công cụ phân tích — không phải sở giao dịch, công ty chứng khoán hay tư vấn đầu tư.

## Data

Cascade:

1. **VPS Securities public price board** (near-live, not HOSE/HNX official)
2. **Yahoo Finance `*.VN`** delayed chart if VPS returns no usable quotes (badge: DELAYED)
3. **DEMO DATA** only if both quote sources fail

EOD overlay: Simplize company summary (shares, EPS, book, ROE, yield, growth). Market cap / P/E / P/B are recomputed from the live print. Missing metrics show — .

VN30 membership follows the SSIAM VN30 ETF creation basket dated **2026-09-15**. Universe: 30 VN30 + 26 liquid HOSE + 10 HNX + 3 UPCoM = 69 unique names, kept only when the live board returns a last print.

See [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) for research, terms caveats, field origin and how to switch providers.

## Language

Vietnamese is the default, even if the browser is English. Toggle Tiếng Việt / English; persisted as `vnstock-locale`.

## Routes

- `/` market dashboard
- `/screener` flagship screener (URL-synced filters, pagination, column visibility)
- `/market` index overview
- `/stock/:symbol` detail + derived MA/RSI/MACD + labelled fundamentals
- `/methodology` sources, universe, quoted vs derived vs source

## Theme

System / light / dark. Choice persists in `localStorage` (`vnstock-theme`). A head script applies the class before paint; CSS `:root` is dark so a missing class does not flash light.

## Setup

```
npm install
npm run dev
```

Optional environment (never commit secrets): copy `.env.example`.

```
MARKET_DATA_PROVIDER=auto
SSI_CONSUMER_ID=
SSI_CONSUMER_SECRET=
```

## Scripts

- `npm run dev` — development
- `npm run build` — production build
- `npm run typecheck`
- `npm test`
- `npm run lint`

## Known limits

- VPS and Simplize usage rights for third-party apps are unclear; labelled, not silent.
- SSI FastConnect is documented but requires partner credentials; this build does not use it for quotes.
- Yahoo delayed fallback does not provide VN30/HNX/UPCoM index snapshots.
- Debt/equity is omitted (no legitimate current source in this environment).
- Cold start may take a few seconds before the EOD overlay fills (30-minute cache afterwards).
