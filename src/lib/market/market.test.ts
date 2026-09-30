import assert from "node:assert/strict";
import { test } from "node:test";
import { applyScreenerFilters, PRESETS, sortScreenerRows } from "./filters.ts";
import {
  asNumber,
  simplizeSummarySchema,
  vpsHistSchema,
  vpsIndexSchema,
  vpsQuoteArraySchema,
  yahooChartSchema,
} from "./schemas.ts";
import { alignHistoryToLast, applyLiveValuation, EMPTY_FUNDAMENTALS, hasLastPrint, sectorSnapshots, signedChange, sliceHistory, universeBreadth } from "./normalize.ts";
import { fieldOrigin } from "./field-origin.ts";
import { MockMarketDataProvider } from "./mock-provider.ts";
import { deriveTechnicals, rsi, sma } from "./technicals.ts";
import { isMarketOpen, sessionPhaseAt } from "./session.ts";
import { contrastRatio, CONTRAST_PAIRS } from "./contrast.ts";
import { boardLotToShares, boardPriceToVnd, parseIndexOt, classifyFetchError, fallbackReasonTag, parseVpsQuotePayload } from "./vps.ts";
import {
  formatIndex,
  formatMarketCap,
  formatPct,
  formatPrice,
  formatRatio,
  formatTurnover,
  formatVolume,
} from "./format.ts";
import { cacheClear, cached } from "./cache.ts";
import { shouldAcceptRefresh } from "./use-live.ts";
import { resolveTheme, THEME_BOOTSTRAP, THEME_KEY } from "../theme-script.ts";
import { DEFAULT_LOCALE, LOCALE_KEY, resolveLocale } from "../i18n/locale.ts";
import { en, vi } from "../i18n/messages.ts";
import {
  DEFAULT_HIDDEN_COLUMNS,
  defaultScreenerVisibility,
  parseScreenerVisibility,
  PINNED_COLUMN,
  SCREENER_COLS_KEY,
  SCREENER_COLUMN_IDS,
  serializeScreenerVisibility,
} from "./screener-columns.ts";
import { UNIVERSE, VN30_SOURCE, VN30_SYMBOLS, buildSecurityUniverse, UNCLASSIFIED_SECTOR } from "./universe.ts";
import { collectQuoteBatches, chunkSymbols } from "./quote-batch.ts";
import { resolveListedSecurity, rowsFromVpsQuotes } from "./live-provider.ts";
import type { VpsQuote } from "./vps.ts";
import type { PricePoint, ScreenerRow } from "./types.ts";

function row(partial: Partial<ScreenerRow>): ScreenerRow {
  return {
    symbol: "AAA",
    name: "Alpha",
    nameVi: "A",
    exchange: "HOSE",
    sector: "Banks",
    vn30: true,
    group: "vn30",
    price: 10000,
    reference: 10000,
    previousClose: 10000,
    change: 0,
    changePct: 0,
    open: 10000,
    high: 10100,
    low: 9900,
    volume: 1000,
    turnover: 10_000_000,
    ceiling: 10700,
    floor: 9300,
    marketCap: null,
    pe: 10,
    pb: 1.2,
    roe: 15,
    dividendYield: 2,
    eps: null,
    bookValue: null,
    debtToEquity: null,
    high52w: 12000,
    low52w: 8000,
    sharesOutstanding: null,
    revenueGrowth: null,
    profitGrowth: null,
    averageVolume: null,
    ...partial,
  };
}

function candle(close: number, i: number): PricePoint {
  return {
    time: Date.now() - (10 - i) * 86_400_000,
    date: "2026-09-01",
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  };
}

test("search matches ticker, English name and Vietnamese name", () => {
  const rows = [
    row({ symbol: "VCB", name: "Vietcombank", nameVi: "Ngân hàng Ngoại thương Việt Nam" }),
    row({ symbol: "HPG", name: "Hoa Phat", nameVi: "Tập đoàn Hòa Phát" }),
  ];
  assert.equal(applyScreenerFilters(rows, { query: "vcb" }).length, 1);
  assert.equal(applyScreenerFilters(rows, { query: "hoa" }).length, 1);
  assert.equal(applyScreenerFilters(rows, { query: "ngoại" }).length, 1);
});

test("filters AND together and can return zero rows", () => {
  const rows = [
    row({ symbol: "VCB", exchange: "HOSE", sector: "Banks", changePct: 1 }),
    row({ symbol: "MBS", exchange: "HNX", sector: "Financials", changePct: -1 }),
  ];
  assert.equal(applyScreenerFilters(rows, { exchanges: ["HOSE"], sectors: ["Banks"] }).length, 1);
  assert.equal(applyScreenerFilters(rows, { exchanges: ["HOSE"], sectors: ["Healthcare"] }).length, 0);
});

test("gainers and losers presets", () => {
  const rows = [
    row({ symbol: "UP", changePct: 2 }),
    row({ symbol: "FLAT", changePct: 0 }),
    row({ symbol: "DN", changePct: -2 }),
  ];
  const gainers = PRESETS.find((p) => p.id === "gainers")!.filters;
  const losers = PRESETS.find((p) => p.id === "losers")!.filters;
  assert.deepEqual(
    applyScreenerFilters(rows, gainers).map((r) => r.symbol),
    ["UP"],
  );
  assert.deepEqual(
    applyScreenerFilters(rows, losers).map((r) => r.symbol),
    ["DN"],
  );
  assert.ok(PRESETS.some((p) => p.id === "hnx"));
  assert.ok(PRESETS.some((p) => p.id === "upcom"));
});

test("sort is stable on symbol for ties", () => {
  const rows = [
    row({ symbol: "BBB", price: 5 }),
    row({ symbol: "AAA", price: 5 }),
    row({ symbol: "CCC", price: 9 }),
  ];
  const sorted = sortScreenerRows(rows, "price", "asc");
  assert.deepEqual(
    sorted.map((r) => r.symbol),
    ["AAA", "BBB", "CCC"],
  );
});

test("null values sort last and reset-equivalent empty query is identity", () => {
  const rows = [row({ symbol: "ZZZ", pe: null }), row({ symbol: "AAA", pe: 8 })];
  assert.deepEqual(
    sortScreenerRows(rows, "pe", "asc").map((r) => r.symbol),
    ["AAA", "ZZZ"],
  );
  assert.equal(applyScreenerFilters(rows, {}).length, 2);
});

test("near-zero change snaps to 0", () => {
  const r = signedChange(10000.2, 10000);
  assert.equal(r.changePct, 0);
});

test("asNumber handles strings and junk", () => {
  assert.equal(asNumber("59.5"), 59.5);
  assert.equal(asNumber(""), null);
  assert.equal(asNumber("nope"), null);
  assert.equal(asNumber(0), 0);
});

test("malformed VPS payload is rejected by schema", () => {
  const bad = vpsQuoteArraySchema.safeParse({ not: "an array" });
  assert.equal(bad.success, false);
  const good = vpsQuoteArraySchema.safeParse([{ sym: "VCB", lastPrice: 59.5, r: 60, lot: 10 }]);
  assert.equal(good.success, true);
});

test("VPS board accepts null openPrice on an unopened name without dumping the universe", () => {
  const liveShaped = [
    { sym: "VCB", lastPrice: 60.3, r: 59.6, lot: 213650, openPrice: "60.0", marketId: "STO" },
    { sym: "PGV", lastPrice: 0, r: 21.3, lot: 0, openPrice: null, marketId: "STO" },
    { sym: "KSF", lastPrice: 79.4, r: 79.5, lot: 4500, openPrice: "79.8", marketId: "STX" },
    { not: "a quote" },
  ];
  assert.equal(vpsQuoteArraySchema.safeParse(liveShaped).success, false);
  assert.equal(vpsQuoteArraySchema.safeParse(liveShaped.slice(0, 3)).success, true);
  const rows = parseVpsQuotePayload(liveShaped);
  assert.equal(rows.length, 3);
  const vcb = rows.find((r) => r.symbol === "VCB");
  const pgv = rows.find((r) => r.symbol === "PGV");
  const ksf = rows.find((r) => r.symbol === "KSF");
  assert.equal(vcb?.last, 60300);
  assert.equal(vcb?.exchange, "HOSE");
  assert.equal(pgv?.last, null);
  assert.equal(pgv?.reference, 21300);
  assert.equal(ksf?.last, 79400);
  assert.equal(ksf?.exchange, "HNX");
  assert.throws(() => parseVpsQuotePayload({ not: "an array" }), /invalid_vps_quotes/);
  assert.throws(() => parseVpsQuotePayload([]), /invalid_vps_quotes/);
});

test("malformed history and yahoo payloads are rejected", () => {
  assert.equal(vpsHistSchema.safeParse({ s: "ok", t: ["x"] }).success, false);
  assert.equal(yahooChartSchema.safeParse({ chart: { result: null } }).success, true);
  assert.equal(yahooChartSchema.safeParse({ nope: 1 }).success, false);
  assert.equal(vpsIndexSchema.safeParse({ cIndex: "bad" }).success, false);
});

test("simplize summary schema accepts a real-shaped payload", () => {
  const parsed = simplizeSummarySchema.safeParse({
    status: 200,
    data: { ticker: "VCB", peRatio: 12.04, outstandingSharesValue: 8355675000, analysisUpdated: "16/09/2026" },
  });
  assert.equal(parsed.success, true);
  assert.equal(simplizeSummarySchema.safeParse({ status: 200, data: null }).success, true);
  assert.equal(simplizeSummarySchema.safeParse("nope").success, false);
});

test("VPS board units convert to dong and shares", () => {
  assert.equal(boardPriceToVnd(59.6), 59600);
  assert.equal(boardPriceToVnd(0), 0);
  assert.equal(boardPriceToVnd(null), null);
  assert.equal(boardLotToShares(154120), 1_541_200);
});

test("index OT string parses breadth", () => {
  const ot = parseIndexOt("1.19|0.07%|8263506.890|107|205|48");
  assert.ok(ot);
  assert.equal(ot.advances, 107);
  assert.equal(ot.declines, 205);
  assert.equal(ot.unchanged, 48);
  assert.equal(parseIndexOt("short"), null);
});

test("mock provider is deterministic and history matches header", async () => {
  const a = new MockMarketDataProvider();
  const b = new MockMarketDataProvider();
  const ra = await a.getSecurities();
  const rb = await b.getSecurities();
  assert.deepEqual(
    ra.map((r) => [r.symbol, r.price, r.changePct]),
    rb.map((r) => [r.symbol, r.price, r.changePct]),
  );
  const vcb = ra.find((r) => r.symbol === "VCB");
  assert.ok(vcb);
  const hist = await a.getPriceHistory("VCB", "ALL");
  assert.equal(hist.at(-1)?.close, vcb.price);
  const again = await a.getPriceHistory("VCB", "ALL");
  assert.deepEqual(hist, again);
  const overview = await a.getMarketOverview();
  assert.equal(overview.attribution.mode, "demo");
  assert.equal(overview.attribution.freshness, "DEMO");
  assert.ok((vcb.pe ?? 0) > 0);
  const detail = await a.getSecurity("VCB");
  assert.ok(detail?.overviewVi);
  assert.equal(detail?.identity.group, "vn30");
});

test("unknown symbol returns null", async () => {
  const p = new MockMarketDataProvider();
  assert.equal(await p.getSecurity("ZZZZ"), null);
});

test("live fundamentals placeholder is all null", () => {
  assert.equal(EMPTY_FUNDAMENTALS.pe, null);
  assert.equal(EMPTY_FUNDAMENTALS.marketCap, null);
  assert.equal(EMPTY_FUNDAMENTALS.roe, null);
  assert.equal(EMPTY_FUNDAMENTALS.bookValue, null);
  assert.equal(EMPTY_FUNDAMENTALS.sharesOutstanding, null);
});

test("applyLiveValuation recomputes cap / PE / PB from the live print", () => {
  const valued = applyLiveValuation(
    { ...EMPTY_FUNDAMENTALS, sharesOutstanding: 100, eps: 5, bookValue: 10, roe: 18 },
    50,
  );
  assert.equal(valued.marketCap, 5_000);
  assert.equal(valued.pe, 10);
  assert.equal(valued.pb, 5);
  assert.equal(valued.roe, 18);
  assert.equal(applyLiveValuation(EMPTY_FUNDAMENTALS, 50).pe, null);
});

test("field origin distinguishes quoted, derived, source and missing", () => {
  assert.equal(fieldOrigin("price", 10, "live"), "quoted");
  assert.equal(fieldOrigin("pe", 12, "live"), "derived");
  assert.equal(fieldOrigin("roe", 18, "live"), "source");
  assert.equal(fieldOrigin("pe", null, "live"), "unavailable");
  assert.equal(fieldOrigin("pe", 12, "demo"), "source");
});

test("technicals are derived from the series last close", () => {
  const series = Array.from({ length: 60 }, (_, i) => ({
    time: i,
    date: "2026-01-01",
    open: 10 + i,
    high: 11 + i,
    low: 9 + i,
    close: 10 + i,
    volume: 1,
  }));
  const t = deriveTechnicals(series);
  assert.equal(t.lastClose, 69);
  assert.ok(t.ma20);
  assert.equal(sma([1, 2, 3, 4], 2), 3.5);
  assert.ok(rsi([1, 2, 3, 4, 5, 4, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 14) != null);
});

test("alignHistoryToLast only mutates the tail close", () => {
  const series = [candle(100, 0), candle(110, 1)];
  const aligned = alignHistoryToLast(series, 112);
  assert.equal(aligned[0].close, 100);
  assert.equal(aligned[1].close, 112);
  assert.equal(series[1].close, 110);
});

test("sliceHistory falls back to last points when window is empty", () => {
  const series = [candle(1, 0)];
  series[0].time = 0;
  const sliced = sliceHistory(series, "1W");
  assert.equal(sliced.length, 1);
});

test("weekend session and lunch are not open", () => {
  const sunday = new Date("2026-09-13T04:00:00Z");
  assert.equal(sessionPhaseAt(sunday), "weekend");
  assert.equal(isMarketOpen("lunch"), false);
  assert.equal(isMarketOpen("continuous_pm"), true);
});

test("contrast pairs meet AA", () => {
  for (const pair of CONTRAST_PAIRS) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    assert.ok(ratio >= pair.min, `${pair.name} ${ratio.toFixed(2)} < ${pair.min}`);
  }
});

test("theme resolution and persistence key", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(THEME_KEY, "vnstock-theme");
  assert.match(THEME_BOOTSTRAP, /vnstock-theme/);
  assert.match(THEME_BOOTSTRAP, /prefers-color-scheme: dark/);
});

test("locale defaults to Vietnamese and dictionaries share keys", () => {
  assert.equal(DEFAULT_LOCALE, "vi");
  assert.equal(LOCALE_KEY, "vnstock-locale");
  assert.equal(resolveLocale(null), "vi");
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("fr"), "vi");
  const viKeys = Object.keys(vi).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(viKeys, enKeys);
  assert.ok(viKeys.length > 80);
});

test("curated seed stays 69 unique names with the documented groups", () => {
  assert.equal(VN30_SYMBOLS.length, 30);
  assert.equal(new Set(VN30_SYMBOLS).size, 30);
  assert.equal(new Set(UNIVERSE.map((s) => s.symbol)).size, UNIVERSE.length);
  assert.equal(UNIVERSE.length, 69);
  assert.equal(UNIVERSE.filter((s) => s.group === "vn30").length, 30);
  assert.equal(UNIVERSE.filter((s) => s.group === "hose_liquid").length, 26);
  assert.equal(UNIVERSE.filter((s) => s.group === "hnx_mcap").length, 10);
  assert.equal(UNIVERSE.filter((s) => s.group === "upcom_mcap").length, 3);
  assert.ok(VN30_SYMBOLS.includes("VCB"));
  assert.ok(VN30_SYMBOLS.includes("MCH"));
  assert.ok(VN30_SYMBOLS.includes("TCX"));
  assert.equal(UNIVERSE.find((s) => s.symbol === "PLX")?.vn30, false);
  assert.equal(UNIVERSE.find((s) => s.symbol === "KSF")?.exchange, "HNX");
  assert.equal(UNIVERSE.find((s) => s.symbol === "VGI")?.exchange, "UPCoM");
  assert.equal(VN30_SOURCE.asOf, "2026-09-15");
});

test("board lists build an equity universe larger than the curated 69", () => {
  const hose = ["VCB", "PLX", "E1VFVN30", "CACB2207", "ZZZ", ...seq(100, 80)];
  const hnx = ["KSF", "BBB", ...seq(200, 40)];
  const upcom = ["VGI", "BBB", ...seq(300, 40)];
  const names = new Map([
    ["ZZZ", { name: "Should drop", nameVi: "Loại", type: "W" }],
    ["AAA", { name: "New Co", nameVi: "Công ty mới", type: "S" }],
    ["VCB", { name: "Not used", nameVi: "Không dùng", type: "S" }],
  ]);
  hose.push("AAA");
  const built = buildSecurityUniverse({
    hose,
    hnx,
    upcom,
    vn30: ["VCB"],
    names,
    vn30FromFeed: true,
  });
  const symbols = built.identities.map((s) => s.symbol);
  assert.equal(new Set(symbols).size, symbols.length);
  assert.ok(built.identities.length > 69);
  assert.ok(built.counts.HOSE > 0);
  assert.ok(built.counts.HNX > 0);
  assert.ok(built.counts.UPCoM > 0);
  assert.ok(!symbols.includes("E1VFVN30"));
  assert.ok(!symbols.includes("CACB2207"));
  assert.ok(!symbols.includes("ZZZ"));
  assert.ok(!symbols.includes("BBB"));
  const vcb = built.identities.find((s) => s.symbol === "VCB");
  assert.equal(vcb?.vn30, true);
  assert.equal(vcb?.group, "vn30");
  assert.equal(vcb?.name, "Vietcombank");
  assert.equal(vcb?.sector, "Banks");
  const aaa = built.identities.find((s) => s.symbol === "AAA");
  assert.equal(aaa?.name, "New Co");
  assert.equal(aaa?.nameVi, "Công ty mới");
  assert.equal(aaa?.sector, UNCLASSIFIED_SECTOR);
  assert.equal(aaa?.vn30, false);
  assert.equal(aaa?.group, "listed");
  const bare = built.identities.find((s) => s.symbol === seq(100, 1)[0]);
  assert.equal(bare?.name, bare?.symbol);
  assert.equal(bare?.sector, UNCLASSIFIED_SECTOR);
  assert.equal(built.identities.find((s) => s.symbol === "PLX")?.vn30, false);
  const exchanges = new Set(built.identities.map((s) => s.exchange));
  assert.deepEqual([...exchanges].sort(), ["HNX", "HOSE", "UPCoM"]);
});

test("quote batches keep successful rows and do not invent prices", async () => {
  assert.deepEqual(chunkSymbols(["A", "B", "C", "D", "E"], 2), [["A", "B"], ["C", "D"], ["E"]]);
  const calls: string[][] = [];
  const partial = await collectQuoteBatches(["A", "B", "C", "D", "E"], 2, async (batch) => {
    calls.push(batch);
    if (batch[0] === "C") throw new Error("http_500");
    return batch.map((symbol) => symbol);
  });
  assert.equal(partial.okBatches, 2);
  assert.equal(partial.failedBatches, 1);
  assert.equal(partial.stoppedEarly, false);
  assert.deepEqual(partial.quotes, ["A", "B", "E"]);
  assert.equal(calls.length, 3);

  let timeoutCalls = 0;
  const stalled = await collectQuoteBatches(["A", "B", "C"], 1, async (batch) => {
    timeoutCalls += 1;
    if (batch[0] === "B") {
      const err = new Error("timeout");
      err.name = "Timeout";
      throw err;
    }
    return batch;
  });
  assert.deepEqual(stalled.quotes, ["A"]);
  assert.equal(stalled.failedBatches, 1);
  assert.equal(stalled.stoppedEarly, true);
  assert.equal(timeoutCalls, 2);

  const identities = [
    { symbol: "VCB", name: "Vietcombank", nameVi: "VCB", exchange: "HOSE" as const, sector: "Banks", vn30: true, group: "vn30" as const },
    { symbol: "PGV", name: "PGV", nameVi: "PGV", exchange: "HOSE" as const, sector: "Utilities", vn30: false, group: "hose_liquid" as const },
    { symbol: "NVB", name: "NVB", nameVi: "NVB", exchange: "HNX" as const, sector: "Banks", vn30: false, group: "listed" as const },
  ];
  const quote = (symbol: string, last: number | null): VpsQuote => ({
    symbol,
    last,
    reference: 10,
    previousClose: 10,
    open: 1,
    high: 1,
    low: 1,
    volume: 1,
    ceiling: 11,
    floor: 9,
    exchange: "HOSE",
  });
  const rows = rowsFromVpsQuotes(identities, [quote("VCB", 60_300), quote("PGV", null), quote("ZZZ", 10)]);
  assert.deepEqual(rows.map((r) => r.symbol), ["VCB", "PGV", "NVB"]);
  assert.equal(rows[0]?.price, 60_300);
  assert.equal(rows[0]?.volume, 1);
  assert.equal(rows[0]?.reference, 10);
  assert.equal(rows[0]?.change, 60_290);
  assert.equal(rows[1]?.price, null);
  assert.equal(rows[1]?.volume, null);
  assert.equal(rows[1]?.reference, null);
  assert.equal(rows[1]?.change, null);
  assert.equal(rows[1]?.turnover, null);
  assert.equal(rows[2]?.price, null);
  const zeroLast = rowsFromVpsQuotes(identities, [quote("NVB", 0)]);
  assert.deepEqual(zeroLast.map((r) => r.symbol), ["VCB", "PGV", "NVB"]);
  assert.ok(zeroLast.every((r) => r.price == null && r.volume == null && r.change == null && r.changePct == null && r.turnover == null));
});

test("unquoted listings stay browseable and out of market statistics", () => {
  const quiet = row({
    symbol: "AAA",
    name: "Alpha JSC",
    nameVi: "Công ty Alpha",
    exchange: "UPCoM",
    sector: "Banks",
    vn30: false,
    group: "listed",
    price: null,
    reference: null,
    previousClose: null,
    change: null,
    changePct: null,
    open: null,
    high: null,
    low: null,
    volume: null,
    turnover: null,
    ceiling: null,
    floor: null,
    pe: null,
    pb: null,
  });
  const hose = row({ symbol: "VCB", name: "Vietcombank", nameVi: "Vietcombank", exchange: "HOSE", sector: "Banks", price: 60_000, changePct: 1.2, volume: 1000, turnover: 60_000_000 });
  const hnx = row({ symbol: "NVB", name: "NCB", nameVi: "NCB", exchange: "HNX", sector: "Banks", price: 8_000, changePct: -0.4, volume: 50, turnover: 400_000 });
  const flat = row({ symbol: "ACB", name: "Asia Commercial Bank", nameVi: "Ngân hàng Á Châu", exchange: "HOSE", sector: "Banks", price: 25_000, changePct: 0, volume: 10, turnover: 250_000 });
  const board = [hose, hnx, flat, quiet];

  assert.equal(hasLastPrint(hose), true);
  assert.equal(hasLastPrint(quiet), false);
  assert.equal(quiet.price, null);
  assert.notEqual(quiet.price, 0);
  assert.equal(quiet.volume, null);
  assert.equal(quiet.change, null);
  assert.equal(quiet.turnover, null);

  assert.deepEqual(applyScreenerFilters(board, { query: "alpha" }).map((r) => r.symbol), ["AAA"]);
  assert.deepEqual(applyScreenerFilters(board, { query: "công ty" }).map((r) => r.symbol), ["AAA"]);
  assert.deepEqual(applyScreenerFilters(board, { exchanges: ["HOSE"] }).map((r) => r.symbol), ["VCB", "ACB"]);
  assert.deepEqual(applyScreenerFilters(board, { exchanges: ["HNX"] }).map((r) => r.symbol), ["NVB"]);
  assert.deepEqual(applyScreenerFilters(board, { exchanges: ["UPCoM"] }).map((r) => r.symbol), ["AAA"]);
  assert.deepEqual(applyScreenerFilters(board, { minPrice: 1 }).map((r) => r.symbol), ["VCB", "NVB", "ACB"]);
  assert.deepEqual(applyScreenerFilters(board, { minVolume: 0 }).map((r) => r.symbol), ["VCB", "NVB", "ACB"]);

  assert.deepEqual(sortScreenerRows(board, "changePct", "desc").map((r) => r.symbol), ["VCB", "ACB", "NVB", "AAA"]);
  assert.deepEqual(sortScreenerRows(board, "changePct", "asc").map((r) => r.symbol), ["NVB", "ACB", "VCB", "AAA"]);
  assert.deepEqual(sortScreenerRows(board, "price", "asc").map((r) => r.symbol), ["NVB", "ACB", "VCB", "AAA"]);
  assert.deepEqual(sortScreenerRows(board, "price", "desc").map((r) => r.symbol), ["VCB", "ACB", "NVB", "AAA"]);
  assert.deepEqual(sortScreenerRows(board, "volume", "desc").map((r) => r.symbol), ["VCB", "NVB", "ACB", "AAA"]);
  assert.deepEqual(sortScreenerRows(board, "turnover", "asc").map((r) => r.symbol), ["ACB", "NVB", "VCB", "AAA"]);
  assert.deepEqual(sortScreenerRows(board, "pe", "desc").map((r) => r.symbol).at(-1), "AAA");

  const breadth = universeBreadth(board);
  assert.equal(breadth.advances, 1);
  assert.equal(breadth.declines, 1);
  assert.equal(breadth.unchanged, 1);
  assert.equal(breadth.advances + breadth.declines + breadth.unchanged, board.filter(hasLastPrint).length);
  const banks = sectorSnapshots(board).find((s) => s.sector === "Banks");
  assert.equal(banks?.count, 3);
  assert.equal(banks?.advancers, 1);
  assert.equal(banks?.decliners, 1);
  assert.equal(banks?.unchanged, 1);

  const listed = UNIVERSE.map((id) => row({ ...id, price: 10_000, changePct: 0, volume: 1 }));
  const vn30 = applyScreenerFilters(listed, { vn30Only: true });
  assert.equal(vn30.length, 30);
  assert.deepEqual(vn30.map((r) => r.symbol).sort(), [...VN30_SYMBOLS].sort());
  for (const seed of UNIVERSE) {
    assert.equal(listed.find((r) => r.symbol === seed.symbol)?.sector, seed.sector);
    assert.equal(listed.find((r) => r.symbol === seed.symbol)?.name, seed.name);
  }
});

test("a listed identity without a last print stays a row and still resolves", () => {
  const identities = [
    { symbol: "VCB", name: "Vietcombank", nameVi: "Vietcombank", exchange: "HOSE" as const, sector: "Banks", vn30: true, group: "vn30" as const },
    { symbol: "PGV", name: "PV Power", nameVi: "PV Power", exchange: "HOSE" as const, sector: "Utilities", vn30: false, group: "hose_liquid" as const },
    { symbol: "ADC", name: "ADC Co", nameVi: "ADC", exchange: "HNX" as const, sector: "—", vn30: false, group: "listed" as const },
    { symbol: "ACM", name: "ACM Co", nameVi: "Công ty ACM", exchange: "UPCoM" as const, sector: "—", vn30: false, group: "listed" as const },
  ];
  const quote = (symbol: string, last: number | null): VpsQuote => ({
    symbol,
    last,
    reference: 10,
    previousClose: 10,
    open: 1,
    high: 2,
    low: 1,
    volume: 5,
    ceiling: 11,
    floor: 9,
    exchange: "HOSE",
  });
  const rows = rowsFromVpsQuotes(identities, [quote("VCB", 58_200), quote("PGV", null), quote("ADC", 0)]);
  assert.deepEqual(rows.map((r) => r.symbol), ["VCB", "PGV", "ADC", "ACM"]);
  const vcb = rows.find((r) => r.symbol === "VCB");
  assert.equal(vcb?.price, 58_200);
  assert.equal(vcb?.volume, 5);
  assert.equal(vcb?.change, 58_190);
  for (const symbol of ["PGV", "ADC", "ACM"]) {
    const quiet = rows.find((r) => r.symbol === symbol);
    assert.ok(quiet);
    assert.equal(quiet?.price, null);
    assert.equal(quiet?.reference, null);
    assert.equal(quiet?.previousClose, null);
    assert.equal(quiet?.change, null);
    assert.equal(quiet?.changePct, null);
    assert.equal(quiet?.open, null);
    assert.equal(quiet?.high, null);
    assert.equal(quiet?.low, null);
    assert.equal(quiet?.volume, null);
    assert.equal(quiet?.turnover, null);
    assert.equal(quiet?.ceiling, null);
    assert.equal(quiet?.floor, null);
  }
  assert.deepEqual(applyScreenerFilters(rows, { exchanges: ["HOSE"] }).map((r) => r.symbol), ["VCB", "PGV"]);
  assert.deepEqual(applyScreenerFilters(rows, { exchanges: ["HNX"] }).map((r) => r.symbol), ["ADC"]);
  assert.deepEqual(applyScreenerFilters(rows, { exchanges: ["UPCoM"] }).map((r) => r.symbol), ["ACM"]);
  assert.deepEqual(applyScreenerFilters(rows, { query: "công ty acm" }).map((r) => r.symbol), ["ACM"]);
  const byPriceDesc = sortScreenerRows(rows, "price", "desc").map((r) => r.symbol);
  const byPriceAsc = sortScreenerRows(rows, "price", "asc").map((r) => r.symbol);
  assert.equal(byPriceDesc[0], "VCB");
  assert.equal(byPriceAsc[0], "VCB");
  assert.deepEqual(byPriceDesc.slice(1).sort(), ["ACM", "ADC", "PGV"]);
  assert.deepEqual(byPriceAsc.slice(1).sort(), ["ACM", "ADC", "PGV"]);
  const breadth = universeBreadth(rows);
  assert.equal(breadth.advances + breadth.declines + breadth.unchanged, 1);
  const missing = resolveListedSecurity(identities, rows, "acm");
  assert.equal(missing?.identity.symbol, "ACM");
  assert.equal(missing?.identity.exchange, "UPCoM");
  assert.equal(missing?.row.price, null);
  assert.equal(resolveListedSecurity(identities, rows, "vcb")?.row.price, 58_200);
  assert.equal(resolveListedSecurity(identities, rows, "ZZZZ"), null);
});

function seq(start: number, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) out.push((start + i).toString(36).toUpperCase().padStart(3, "0").slice(-3));
  return out;
}

test("cache coalesces inflight and stores the first result", async () => {
  cacheClear();
  let n = 0;
  const p1 = cached("k", 5_000, async () => {
    n += 1;
    await new Promise((r) => setTimeout(r, 20));
    return 1;
  });
  const p2 = cached("k", 5_000, async () => {
    n += 1;
    return 2;
  });
  assert.equal(await p1, 1);
  assert.equal(await p2, 1);
  assert.equal(n, 1);
  assert.equal(await cached("k", 5_000, async () => 9), 1);
  cacheClear();
});

test("live refresh never replaces a good snapshot with demo", () => {
  assert.equal(shouldAcceptRefresh({ degraded: false }, { degraded: true }), false);
  assert.equal(shouldAcceptRefresh({ degraded: true }, { degraded: false }), true);
  assert.equal(shouldAcceptRefresh({ degraded: false }, { degraded: false }), true);
});

test("screener column defaults pin ticker and hide optional fields", () => {
  assert.equal(PINNED_COLUMN, "symbol");
  assert.equal(SCREENER_COLS_KEY, "vnstock-screener-cols");
  const vis = defaultScreenerVisibility();
  assert.equal(vis.symbol, true);
  assert.equal(vis.exchange, false);
  assert.equal(vis.turnover, false);
  assert.equal(vis.roe, false);
  assert.equal(vis.dividendYield, false);
  for (const id of DEFAULT_HIDDEN_COLUMNS) assert.equal(vis[id], false);
  assert.ok(SCREENER_COLUMN_IDS.indexOf("price") < SCREENER_COLUMN_IDS.indexOf("exchange"));
  assert.ok(SCREENER_COLUMN_IDS.indexOf("marketCap") < SCREENER_COLUMN_IDS.indexOf("pe"));
  const round = parseScreenerVisibility(serializeScreenerVisibility({ ...vis, pe: false, symbol: false }));
  assert.equal(round.symbol, true);
  assert.equal(round.pe, false);
  assert.equal(round.exchange, false);
  assert.deepEqual(parseScreenerVisibility("not-json").exchange, false);
  assert.equal(parseScreenerVisibility(null).symbol, true);
});

test("Vietnamese number convention keeps units in headers, not cells", () => {
  assert.equal(formatPrice(59200, "vi"), "59.200");
  assert.equal(formatPrice(21250, "vi"), "21.250");
  assert.equal(formatPrice(21.25, "vi"), "21,25");
  assert.equal(formatVolume(637_840, "vi"), "637.840");
  assert.equal(formatVolume(1_010_800, "vi"), "1.010.800");
  assert.equal(formatVolume(190_006_890, "vi"), "190.006.890");
  assert.equal(formatVolume(1_900_000_000, "vi"), "1.900.000.000");
  assert.equal(formatTurnover(60_040_000_000, "vi"), "60,04");
  assert.equal(formatTurnover(37_760_000_000, "vi"), "37,76");
  assert.equal(formatTurnover(3_897_002_919_000, "vi"), "3.897");
  assert.equal(formatMarketCap(496_290_000_000_000, "vi"), "496.290");
  assert.equal(formatMarketCap(499_670_000_000_000, "vi"), "499.670");
  assert.equal(formatPct(0.34, "vi"), "+0,34%");
  assert.equal(formatRatio(11.9, 1, "vi"), "11,9");
  assert.equal(formatIndex(1821.45, "vi"), "1.821,45");
  assert.equal(formatVolume(null, "vi"), "—");
  assert.ok(!formatVolume(637_840, "vi").includes("CP"));
  assert.ok(!formatVolume(1_010_800, "vi").includes("triệu"));
  assert.ok(!formatTurnover(60_040_000_000, "vi").includes("tỷ"));
  assert.ok(!formatTurnover(60_040_000_000, "vi").includes("đồng"));
  assert.ok(!formatMarketCap(496_290_000_000_000, "vi").includes("nghìn"));
});

test("English number convention uses grouping, not mixed M/B/T suffixes", () => {
  assert.equal(formatPrice(59200, "en"), "59,200");
  assert.equal(formatVolume(637_840, "en"), "637,840");
  assert.equal(formatVolume(1_010_800, "en"), "1,010,800");
  assert.equal(formatTurnover(60_040_000_000, "en"), "60.04");
  assert.equal(formatTurnover(37_760_000_000, "en"), "37.76");
  assert.equal(formatTurnover(3_897_002_919_000, "en"), "3,897");
  assert.equal(formatMarketCap(496_290_000_000_000, "en"), "496,290");
  assert.equal(formatPct(0.34, "en"), "+0.34%");
  assert.equal(formatRatio(11.9, 1, "en"), "11.9");
  assert.equal(formatIndex(1821.45, "en"), "1,821.45");
  assert.ok(!/[KMBT]$/.test(formatVolume(1_010_800, "en")));
  assert.ok(!/[KMBT]$/.test(formatTurnover(60_040_000_000, "en")));
  assert.ok(!/[KMBT]$/.test(formatMarketCap(496_290_000_000_000, "en")));
});

test("screener headers carry units; cells stay numeric", () => {
  assert.equal(vi["screener.col.price"], "Giá (VND)");
  assert.equal(vi["screener.col.changePct"], "Thay đổi (%)");
  assert.equal(vi["screener.col.volume"], "KL (CP)");
  assert.match(vi["screener.col.turnover"], /tỷ/);
  assert.match(vi["screener.col.marketCap"], /tỷ/);
  assert.equal(vi["screener.col.pe"], "P/E (x)");
  assert.equal(vi["screener.col.pb"], "P/B (x)");
  assert.equal(vi["screener.col.roe"], "ROE (%)");
  assert.equal(en["screener.col.price"], "Price (VND)");
  assert.equal(en["screener.col.changePct"], "Change (%)");
  assert.match(en["screener.col.volume"], /shares/);
  assert.match(en["screener.col.turnover"], /VND bn/);
  assert.match(en["screener.col.marketCap"], /VND bn/);
  assert.equal(en["screener.col.pe"], "P/E (x)");
  assert.equal(en["screener.col.pb"], "P/B (x)");
  assert.equal(en["screener.col.roe"], "ROE (%)");
  assert.match(vi["screener.colTitle.turnover"], /tỷ VND/);
  assert.match(en["screener.colTitle.marketCap"], /VND billion/);
});

test("VPS fetch errors classify into cascade reasons", () => {
  const timeout = new Error("timeout");
  timeout.name = "Timeout";
  assert.equal(classifyFetchError(timeout), "timeout");
  const rate = new Error("rate_limited");
  rate.name = "RateLimited";
  assert.equal(classifyFetchError(rate), "rate_limited");
  assert.equal(classifyFetchError(new Error("http_503")), "http_503");
  assert.equal(classifyFetchError(new Error("invalid_vps_quotes")), "invalid_schema");
  assert.equal(fallbackReasonTag("timeout"), "timeout");
  assert.equal(fallbackReasonTag("rate_limited"), "rate_limited");
  assert.equal(fallbackReasonTag("http_503"), "http");
  assert.equal(fallbackReasonTag("invalid_schema"), "invalid_schema");
  assert.equal(fallbackReasonTag("vps_no_usable_last (payload=0)"), "no_usable_quote");
  assert.equal(fallbackReasonTag("vps_history_thin (bars=2)"), "no_usable_quote");
  assert.equal(fallbackReasonTag("fetch failed"), "unknown");
  assert.equal(fallbackReasonTag(undefined), "unknown");
});
