# VNStock — Project Status

**Updated:** 2026-09-18 (live-data reliability — VPS invalid schema)

Authoritative sources (highest → lowest): running application → browser behavior → live payloads → build/test/lint output → source → this file.

---

## VERDICT SUMMARY

| Item | Status |
|---|---|
| Why DELAYED / “VPS skipped: invalid schema” | **ADAPTER BUG, not a dead VPS feed.** PGV sent `openPrice: null` (unopened). Zod rejected the **entire** 69-row array. |
| VPS after fix | **VERIFIED LIVE** 10:25 ICT continuous morning. Badge **BẢNG GIÁ TRỰC TUYẾN**, source VPS, VCB 60.300 ₫ |
| VPS reliability (n=10) | **10/10 HTTP 200**, 69 rows, 68 usable lasts. Latency median 1.4 s; 2/10 at 13–14 s |
| Yahoo this load | **Not used** for quotes or as a skip-reason |
| SSI FastConnect | **BLOCKED** — no ConsumerID/Secret; unauth DailyStockPrice 401 |
| HOSE/HNX official | **BLOCKED** — commercial |
| Better unauthenticated live source | **NONE** |
| Open-source “feeds” | Adapters over scrapes (vnstock → VCI/KBS/MSN). **Not a vendor.** Not added |
| Typecheck / tests / lint / build | **PASS** |
| Architecture | **Unchanged** VPS → Yahoo DELAYED → DEMO |

---

## THIS PASS

### 1. Root cause

Captured live board during session (`getliststockdata` × 69, 200, ~1.6 s, 67 kB JSON array).

Same shape as the documented board (`sym`, `lastPrice`, `r`, `lot`, `c`, `f`, `openPrice`, `marketId`, …). Extra fields (`g1`…`g7`, `rightInfos`, …) already allowed via `.passthrough()`.

**One row:** PGV HOSE `lastPrice: 0`, `openPrice: null`, `lot: 0`, `r: 21.3`. Has not traded.

Schema was:

```ts
openPrice: z.union([finite, z.string()]).optional()
```

`.optional()` ≠ `.nullable()`. Zod `invalid_union` at `45.openPrice` failed `z.array(vpsQuoteSchema)` for all 69 names → `invalid_vps_quotes` → classified `invalid_schema` → DELAYED Yahoo.

Not: schema change by VPS, rate-limit, headers, HTML, or a wrapped envelope. App UA and browser UA returned the same JSON.

### 2. Adapter fix (narrow)

- Board numerics are `.nullish()` (number \| string \| null \| omitted)
- Parse **row-by-row**; skip a malformed name; throw `invalid_vps_quotes` only if the payload is not an array or **no** valid rows remain
- `lastPrice <= 0` → no last print (PGV drops out; not shown as 0 ₫)
- Quote timeout **15 s** (matches indices). 2/10 live calls took 13–14 s and would still have aborted at 8 s after the schema fix

Did **not** loosen validation to `z.any()`. Non-arrays still fail.

### 3. Reliability

10 requests, ~3 s apart, ~10:20 ICT:

| Metric | Result |
|---|---|
| Success | 10/10 HTTP 200 |
| Invalid-schema on raw JSON | 10/10 **before** fix (PGV null); 0/10 after |
| Usable quotes | 68/69 (PGV unopened) |
| Exchanges | HOSE 56, HNX 10, UPCoM 3 |
| Latency | 1393–14009 ms (median 1419) |

VPS can serve this universe. Occasional 13–14 s is a stall, not a schema change.

### 4. Legitimate alternatives investigated

| Option | Usable now? |
|---|---|
| **SSI FastConnect Data** | Documented realtime WS (X/MI/B) + REST. Requires iBoard ConsumerID/Secret. Env empty. DailyStockPrice without token: **401**. Token POST with junk: **400**. SDK: Data REST no OTP; Stream OTP. **Keep token client; do not call it without keys.** |
| HOSE webservice | ~150–300M VND/year. Blocked |
| VNDIRECT / TCBS / Vietcap | Undocumented / 403. Same legitimacy class as VPS, not better |
| vnstock / vntickers | **Software adapters**, upstream is VCI/KBS/MSN scrape. Not a broker-neutral licensed feed |
| Kun/StockerAPI | Commercial token API. Not added |

**No suitable unauthenticated replacement.** Yahoo stays DELAYED fallback (HOSE only; HNX/UPCoM `*.VN` 404).

### 5. Provider architecture (kept)

```
PRIMARY  VPS public board
SECONDARY Yahoo delayed *.VN
LAST     DEMO
```

LIVE only when VPS (or a future credentialed live source) actually served the quotes. DELAYED only when Yahoo served them. DEMO only when both fail. Field-level provenance for EOD overlay unchanged.

### 6. Browser (session open, 10:25 ICT)

| Page | Badge | Source | Notes |
|---|---|---|---|
| `/` | BẢNG GIÁ TRỰC TUYẾN | VPS | Liên tục · sáng · EOD 2026-09-18 |
| `/screener` | LIVE | VPS | HNX NVB 12.800 (Yahoo cannot serve this) |
| `/stock/VCB` | LIVE | VPS | 60.300 ₫ · no skip chip |

---

## VERIFICATION

| Check | Result |
|---|---|
| `tsc --noEmit` | Pass |
| `npx eslint` (changed files) | Pass |
| `npm test` | Pass (88) including null-`openPrice` fixture |
| `npm run build` | Pass |
| Live payload through new parser | 69 rows, 68 usable, VCB 60,300, PGV last=null |
| Browser 10:25 ICT | LIVE / VPS, no Yahoo, no skip reason |

---

## FILES CHANGED

- [`src/lib/market/schemas.ts`](src/lib/market/schemas.ts) — board numerics `.nullish()`
- [`src/lib/market/vps.ts`](src/lib/market/vps.ts) — per-row parse, skip zero lasts, 15 s quote timeout
- [`src/lib/market/market.test.ts`](src/lib/market/market.test.ts)
- [`docs/DATA_PROVIDERS.md`](docs/DATA_PROVIDERS.md)
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)

---

## REMAINING LIMITS

- VPS board usage rights for third-party apps remain unclear — labelled
- VPS sometimes stalls 13–14 s (now inside 15 s); slower than 15 s still falls to DELAYED Yahoo
- Unopened names (PGV this session) are omitted rather than shown at 0
- Yahoo delayed fallback cannot serve HNX/UPCoM
- SSI FastConnect is the documented legitimate realtime upgrade path **only with credentials**
- Not the full listed market
