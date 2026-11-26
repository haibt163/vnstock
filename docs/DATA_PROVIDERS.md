# Data providers

## Research summary (2026-09-18, market session)

| Source | What it provides | Auth | Real-time vs delayed | History | Terms | Decision |
|---|---|---|---|---|---|---|
| HOSE / HNX official | ICE feed, HOSE webservice (realtime 300M VND/year display; delayed 150M; API/webservice listed) | Commercial contract | Licensed | Yes | Licensed redistribution | **Blocked** |
| SSI FastConnect Data | REST: Securities, DailyOHLC, IntradayOHLC, DailyStockPrice, indices. WS: F/X/R/MI/B (status, best bid/ask+trade, foreign room, index, tick OHLC) | ConsumerID + Secret from iBoard registration. REST Data client: no OTP. Stream client: OTP per SSI SDK. | REST is EOD/intraday history; **WS is the realtime board** | Yes | Official broker product; not a public unauthenticated API | **Not usable here.** `SSI_CONSUMER_*` unset. Unauthenticated DailyStockPrice → 401 `Missing Authorization header`. Fake token POST → 400. Do not pretend VPS quotes are FastConnect. |
| VPS public board `bgapidatafeed.vps.com.vn` | Equity quotes, 4 indices, daily history | None | Public board behind banggia.vps.com.vn; near-live in session | Daily | Undocumented for third-party apps | **PRIMARY.** Adapter bug (null `openPrice`) was dumping a valid 69-row board to Yahoo. Fixed. |
| Yahoo Finance `*.VN` chart | Quotes + daily OHLCV in dong | None | Delayed | HOSE yes; HNX/UPCoM 404 | ToS restrict redistribution | **DELAYED fallback only** |
| Simplize company summary | EOD mcap/shares/EPS/book/ROE/yield | None | EOD | — | Undocumented | Overlay only. Never LIVE. |
| VNDIRECT / TCBS / Vietcap / CafeF | Internal or WAF-blocked endpoints | None / session | Undocumented | Mixed | Not a documented public API | **Not added** |
| vnstock (Python) / vntickers | Software adapters over VCI, KBS, MSN (scrapes); not a vendor | Library licence | Upstream | Yes | Library ≠ data licence | **Not used.** Open-source code is not a legitimate feed. |
| Kun / StockerAPI | Commercial Vietnam WS/HTTP | Token | Claimed realtime | Yes | Paid product | **Not added** — credentials + commercial |

## Cascade (unchanged hierarchy)

```
PRIMARY   VPS public board (near-live quotes + 4 indices)
    ↓ if VPS throws (timeout / 429 / HTTP / no valid rows) OR zero usable last prints
SECONDARY Yahoo Finance *.VN chart (labelled DELAYED)
    ↓ if both quote sources fail
DEMO      deterministic fixture (labelled DEMO DATA)
```

No large rewrite. SSI is the documented legitimate realtime alternative **when credentials exist**; it is not wired as a quote source without keys.

## 2026-09-18 diagnosis — “VPS skipped: invalid schema”

**Verdict: adapter, not the provider.**

Live `GET getliststockdata/{69}` during continuous morning session:

- HTTP **200**, JSON **array length 69**, HOSE 56 / HNX 10 / UPCoM 3
- 68 names had a positive `lastPrice`; **PGV** (HOSE) had `lastPrice: 0`, `openPrice: null`, `lot: 0` — has not matched yet
- Zod required `openPrice` to be number|string and treated `.optional()` as “missing”, **not null**. One null field failed `z.array(...)` for the whole universe → `invalid_vps_quotes` → DELAYED Yahoo
- Browser UA vs app UA: same payload. Not rate-limit, not HTML, not a wrapped object

Fix (not “accept anything”):

- Board numerics are `.nullish()` (number | string | null | omitted)
- Rows are parsed individually; a malformed name is skipped
- `lastPrice <= 0` → `last = null` (unopened names drop out of the universe, they are not shown as 0 ₫)
- Non-arrays still throw `invalid_vps_quotes`
- Quote timeout **15 s**, same as indices (VPS sometimes returns a valid board in 13–14 s)

### Reliability sample (10 sequential requests, ~3 s apart, 10:20 ICT)

| | |
|---|---|
| HTTP 200 | 10/10 |
| Rows | 69/69 every time |
| Usable last prints | 68/68 every time (PGV unopened) |
| `openPrice: null` | 1/69 every time (PGV) |
| Latency | min 1393 ms · median 1419 · max 14009 · mean ~3920 |
| Slow tails | 2/10 at 13.4–14.0 s (would have aborted at the old 8 s quote timeout) |

After the adapter fix, browser at 10:25 ICT: **BẢNG GIÁ TRỰC TUYẾN**, source VPS, session Liên tục · sáng, VCB 60.300 ₫. HNX name NVB present (Yahoo `*.VN` 404s HNX).

## 2026-09-17 live trace (session open, ~10:18 ICT)

End-to-end VPS quote request that day succeeded (no unopened names in that snapshot). See git history of this file for the full 09-17 payload notes.

Yahoo delayed probe: HOSE `VCB.VN` works. **HNX and UPCoM `*.VN` 404.** A Yahoo quote fallback still drops those 13 names.

## Units (verified)

- VPS `lastPrice` 60.3 → ×1000 = 60,300 ₫. `lot` ×10 ≈ share volume.
- Yahoo `*.VN` chart prices are already in dong (do not multiply).
- Simplize EPS / book are in dong; `outstandingSharesValue` is shares; ROE / yield / growth are percent.
- Derived: market cap = live price × shares; P/E = price / EPS; P/B = price / book.

Display (unit-in-header): volume is a share count; turnover and market cap are **tỷ VND / VND billion**.

## Universe (quality over a forced 69)

| Group | Count | Source | As of |
|---|---|---|---|
| VN30 | 30 | SSIAM VN30 ETF creation basket | 2026-09-15 |
| HOSE extras | 26 | vonhoa.com market-cap ranking, excluding VN30 | 2026-09-15 |
| HNX | 10 | HNX / vonhoa market-cap ranking | 2026-09-15 |
| UPCoM | 3 | VGI, ACV, MVN | 2026-09-15 |
| **Unique** | **69** | Dropped if the live board omits a last print | |

## Caching

- Quotes / indices: 20s TTL, in-memory, request coalescing
- History: 5 minutes
- Simplize overlay: 30 minutes
- Quote fetch timeout: 15 s
- No database

## Switching providers

`MARKET_DATA_PROVIDER=auto|vps|mock|ssi`

- `auto` / `vps`: VPS → Yahoo delayed → demo
- `mock`: deterministic fixture, DEMO badge
- `ssi` without keys: demo, **labelled as not FastConnect** — never implied
- `ssi` with keys: token client exists; quotes still use the VPS/Yahoo cascade until a credentialed FastConnect quote adapter is implemented

## Sector metadata probe (2026-11-26, read-only)

VERIFIED from live responses of already-integrated providers. No field names guessed.

### VPS `getlistallstock`

Endpoint: `https://bgapidatafeed.vps.com.vn/getlistallstock`

Payload is a JSON array (observed length ~3785). Sample rows (HOSE/HNX/UPCoM):

| Field | Sample values |
|---|---|
| stock_code | VCB, HPG, NVB, PVS, VGI, ACV |
| name_vn | Ngân hàng TMCP Ngoại Thương Việt Nam, ... |
| name_en | Ngân hàng Thương mại Cổ phần Ngoại Thương Việt Nam, ... |
| name_short | VCB Joint Stock Company, ... |
| type | S (equity) |
| post_to | HOSE, HNX, UPCOM |
| C | 1 (HOSE), 2 (HNX), 3 (UPCOM) |

**No industry, sector, category, or ICB/GICS field is present.** Names and type only. UNVERIFIED for any other undocumented VPS endpoint.

### Simplize `GET /api/company/summary/{ticker}`

Already integrated for EOD fundamentals overlay (schema uses `.passthrough()`). Live responses for multiple tickers on each exchange contain sector-related fields in `data`:

| Field | Example (VCB) | Example (HPG) | Example (FPT) | Example (VGI) | Example (DHG) |
|---|---|---|---|---|---|
| bcEconomicSectorName | Tài chính | Nguyên vật liệu | Công nghệ | Công nghệ | Chăm sóc sức khỏe |
| bcIndustryGroupType | BANK | MANUFACTURING | MANUFACTURING | MANUFACTURING | MANUFACTURING |
| industryActivity | Tài chính ngân hàng | Kim loại và Khai khoáng | Phần mềm và dịch vụ CNTT | Dịch vụ Viễn thông | Dược phẩm |
| bcIndustryGroupSlug | tai-chinh-ngan-hang | kim-loai-va-khai-khoang | phan-mem-va-dich-vu-cntt | dich-vu-vien-thong | duoc-pham |
| bcIndustryGroupCode | 551010 | 512010 | 572010 | 574010 | — |
| stockExchange | HOSE | HOSE | HOSE | UPCOM | — |

Additional verified samples: SSI/MBS/SHS (Tài chính / INVESTMENT / Chứng khoán...), PVI (Tài chính / INSURANCE / Bảo hiểm), GAS/BSR/PLX (Năng lượng / Dầu và Khí đốt), VNM/SAB/MSN/SBT (Hàng hóa thiết yếu), MWG/FRT (Hàng hóa không thiết yếu), VHM/NVL/KBC (Bất động sản), REE/POW (Tiện ích), ACV/HUT (Công nghiệp), MVN (Công nghiệp / Vận chuyển hàng hóa...), GMD (Công nghiệp / Cơ sở hạ tầng giao thông vận tải).

**Conclusion:** Simplize returns usable industry/sector metadata. VPS names feed does not. Branch A selected.

Licensing/terms: Simplize usage rights for third-party apps remain undocumented (same caveat as existing fundamentals overlay). Do not treat as official exchange classification.

### Known mapping differences (documented, not fixed by new rules)

The mapping uses only observed Simplize fields and the existing app sector names. Two curated names illustrate where Simplize’s classification differs from the curated taxonomy:

- **GMD** (curated: Logistics): Simplize returns `bcEconomicSectorName` = "Công nghiệp", `industryActivity` = "Cơ sở hạ tầng giao thông vận tải". The mapping therefore places similar non-curated port/infrastructure names in **Industrials**. Curated GMD keeps Logistics.
- **REE** (curated: Industrials): Simplize returns `bcEconomicSectorName` = "Tiện ích". Non-curated names with the same field land in **Utilities**. Curated REE keeps Industrials.

No additional rules were invented to force these into the curated labels. Curated precedence is preserved. If a tighter Logistics rule is later desired, it should be based on further observed `industryActivity` strings, not inference.

### Coverage timing

- Curated 69: full fundamentals fetch on the first overlay call (same as main), then 30-minute cache.
- Non-curated sectors: per-symbol store, 24-hour TTL, up to 40 new symbols per overlay call. With ~1,450 non-curated names, full coverage requires roughly 1,450 / 40 ≈ 37 successful overlay cycles. The store is in-memory and resets on process restart.
