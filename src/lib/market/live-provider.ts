import { genericOverview, lookupIdentity, UNIVERSE, UNIVERSE_SYMBOLS, VN30_SOURCE } from "./universe.ts";
import { cached } from "./cache.ts";
import { applyScreenerFilters } from "./filters.ts";
import { isMarketOpen, makeAsOf, sessionPhaseAt } from "./session.ts";
import { fetchVpsHistory, fetchVpsIndex, fetchVpsQuotes, classifyFetchError } from "./vps.ts";
import { fetchYahooHistory, fetchYahooIndex, fetchYahooQuotes } from "./yahoo.ts";
import { fetchSimplizeSummaries, type SimplizeSnapshot } from "./simplize.ts";
import {
  alignHistoryToLast,
  applyLiveValuation,
  derive52w,
  EMPTY_FUNDAMENTALS,
  quoteToRow,
  rangeStart,
  sectorSnapshots,
  signedChange,
  sliceHistory,
  universeBreadth,
} from "./normalize.ts";
import type {
  ChartRange,
  DataAttribution,
  DataSourceId,
  MarketDataProvider,
  MarketOverview,
  PricePoint,
  Quote,
  ScreenerFilters,
  ScreenerRow,
  SecurityDetail,
} from "./types.ts";
import { ProviderError } from "./types.ts";

const QUOTE_TTL = 20_000;
const INDEX_TTL = 20_000;
const HIST_TTL = 5 * 60_000;
const OVERLAY_WAIT_MS = 6_000;

type QuoteSource = "vps" | "yahoo";

interface QuoteBundle {
  rows: ScreenerRow[];
  quoteSource: QuoteSource;
  fallbackReason?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("simplize_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function liveAttribution(
  quoteSource: QuoteSource,
  overlay: { covered: number; asOf: string | null },
  partial?: Partial<DataAttribution>,
): DataAttribution {
  const asOf = makeAsOf();
  const session = sessionPhaseAt();
  const open = isMarketOpen(session);
  const delayed = quoteSource === "yahoo";
  const caveats = [
    delayed
      ? "Quotes from Yahoo Finance (delayed *.VN chart). Not an official HOSE/HNX feed."
      : "Public broker board, not an official HOSE/HNX feed.",
    "Not a substitute for licensed real-time market data.",
    overlay.covered > 0
      ? "Valuation overlay: market cap = live price × shares; P/E = price / EPS; P/B = price / book. Shares, EPS, book, ROE, yield and growth come from a Simplize EOD snapshot (not an official exchange feed; usage rights unclear)."
      : "P/E, P/B, ROE, dividend yield and market cap are omitted when the EOD overlay is unavailable.",
    `VN30 membership as of ${VN30_SOURCE.asOf} via ${VN30_SOURCE.name}.`,
  ];
  if (delayed && partial?.fallbackReason) {
    caveats.unshift(`VPS board skipped (${partial.fallbackReason}); serving delayed Yahoo *.VN.`);
  }
  return {
    mode: "live",
    sourceId: quoteSource,
    sourceLabel: delayed ? "Yahoo Finance (delayed *.VN)" : "VPS Securities public price board",
    freshness: delayed ? "DELAYED" : open ? "LIVE" : "MARKET_CLOSED",
    asOfIso: asOf.asOfIso,
    asOfIct: asOf.asOfIct,
    session,
    caveats,
    quoteSourceId: quoteSource,
    fundamentalsSourceId: overlay.covered > 0 ? "simplize" : undefined,
    fundamentalsAsOf: overlay.asOf ?? undefined,
    ...partial,
  };
}

function vpsRow(id: (typeof UNIVERSE)[number], q: Awaited<ReturnType<typeof fetchVpsQuotes>>[number]): ScreenerRow {
  const ref = q.reference ?? q.previousClose;
  const { change, changePct } = signedChange(q.last, ref);
  const identity = { ...id, exchange: q.exchange ?? id.exchange };
  const quote: Quote = {
    symbol: id.symbol,
    price: q.last,
    reference: ref,
    previousClose: q.previousClose ?? ref,
    change,
    changePct,
    open: q.open,
    high: q.high,
    low: q.low,
    volume: q.volume,
    turnover: q.last != null && q.volume != null ? q.last * q.volume : null,
    ceiling: q.ceiling,
    floor: q.floor,
  };
  return quoteToRow(identity, quote, EMPTY_FUNDAMENTALS);
}

async function loadQuoteBundle(): Promise<QuoteBundle> {
  return cached("quotes:composite", QUOTE_TTL, async () => {
    let fallbackReason: string | undefined;
    try {
      const raw = await fetchVpsQuotes(UNIVERSE_SYMBOLS);
      const bySym = new Map(raw.map((q) => [q.symbol, q]));
      const rows: ScreenerRow[] = [];
      for (const id of UNIVERSE) {
        const q = bySym.get(id.symbol);
        if (!q || q.last == null) continue;
        rows.push(vpsRow(id, q));
      }
      if (rows.length > 0) return { rows, quoteSource: "vps" as const };
      fallbackReason = `vps_no_usable_last (payload=${raw.length})`;
      console.warn("[vnstock] VPS returned no usable last prints", fallbackReason);
    } catch (err) {
      fallbackReason = classifyFetchError(err);
      console.warn("[vnstock] VPS quotes failed → Yahoo delayed", fallbackReason);
    }

    const yahoo = await fetchYahooQuotes(UNIVERSE_SYMBOLS);
    const bySym = new Map(yahoo.map((q) => [q.symbol, q]));
    const rows: ScreenerRow[] = [];
    for (const id of UNIVERSE) {
      const q = bySym.get(id.symbol);
      if (!q || q.price == null) continue;
      rows.push(
        quoteToRow(id, q, {
          ...EMPTY_FUNDAMENTALS,
          high52w: q.high52w,
          low52w: q.low52w,
        }),
      );
    }
    if (rows.length === 0) {
      throw new ProviderError("unavailable", "VPS and Yahoo both returned no usable quotes.");
    }
    return { rows, quoteSource: "yahoo" as const, fallbackReason };
  });
}

function applySnapshot(row: ScreenerRow, snap: SimplizeSnapshot): ScreenerRow {
  const { asOf: _asOf, averageVolume, ...fund } = snap;
  const valued = applyLiveValuation(
    {
      ...EMPTY_FUNDAMENTALS,
      ...fund,
      high52w: row.high52w,
      low52w: row.low52w,
    },
    row.price,
  );
  return { ...row, ...valued, averageVolume: averageVolume ?? row.averageVolume };
}

async function overlaySimplize(rows: ScreenerRow[]): Promise<{
  rows: ScreenerRow[];
  covered: number;
  asOf: string | null;
}> {
  try {
    const map = await withTimeout(fetchSimplizeSummaries(rows.map((r) => r.symbol)), OVERLAY_WAIT_MS);
    let covered = 0;
    let asOf: string | null = null;
    const next = rows.map((row) => {
      const snap = map.get(row.symbol);
      if (!snap) return row;
      covered += 1;
      if (!asOf && snap.asOf) asOf = snap.asOf;
      return applySnapshot(row, snap);
    });
    return { rows: next, covered, asOf };
  } catch {
    return { rows, covered: 0, asOf: null };
  }
}

async function loadLiveBoard() {
  const bundle = await loadQuoteBundle();
  const overlay = await overlaySimplize(bundle.rows);
  return { ...bundle, rows: overlay.rows, overlay };
}

async function loadIndices() {
  return cached("indices:composite", INDEX_TTL, async () => {
    const codes = ["10", "11", "02", "03"] as const;
    const results = await Promise.allSettled(codes.map((c) => fetchVpsIndex(c)));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn("[vnstock] VPS index failed", codes[i], classifyFetchError(r.reason));
      }
    });
    const vps = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (vps.length > 0) return vps;
    const vn = await fetchYahooIndex("^VNINDEX.VN", "VNINDEX", "VN-Index");
    return vn ? [vn] : [];
  });
}

async function loadHistory(symbol: string): Promise<{
  points: PricePoint[];
  source: QuoteSource;
  fallbackReason?: string;
}> {
  return cached(`hist:${symbol}`, HIST_TTL, async () => {
    const to = Math.floor(Date.now() / 1000) + 3600;
    const from = Math.floor(rangeStart("ALL") / 1000);
    try {
      const vps = await fetchVpsHistory(symbol, from, to);
      if (vps.length >= 5) return { points: vps, source: "vps" as const };
      const fallbackReason = `vps_history_thin (bars=${vps.length})`;
      console.warn("[vnstock] VPS history thin, Yahoo delayed", symbol, fallbackReason);
      return { points: await fetchYahooHistory(symbol, "2y"), source: "yahoo" as const, fallbackReason };
    } catch (err) {
      const fallbackReason = classifyFetchError(err);
      console.warn("[vnstock] VPS history failed, Yahoo delayed", symbol, fallbackReason);
      return { points: await fetchYahooHistory(symbol, "2y"), source: "yahoo" as const, fallbackReason };
    }
  });
}

export class LiveMarketDataProvider implements MarketDataProvider {
  readonly id: DataSourceId = "composite";

  async getSecurities(filters?: ScreenerFilters): Promise<ScreenerRow[]> {
    const board = await loadLiveBoard();
    return applyScreenerFilters(board.rows, filters);
  }

  async getIndices() {
    return loadIndices();
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const [board, indices] = await Promise.all([loadLiveBoard(), loadIndices()]);
    const rows = board.rows;
    const hose = indices.find((i) => i.code === "VNINDEX");
    const breadthFromIndex =
      hose && hose.advances != null && hose.declines != null && hose.unchanged != null
        ? {
            scope: "exchange" as const,
            label: "HOSE board (VPS index feed)",
            advances: hose.advances,
            declines: hose.declines,
            unchanged: hose.unchanged,
          }
        : null;
    const ub = universeBreadth(rows);
    const byChange = [...rows].sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999));
    const byVol = [...rows].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return {
      attribution: liveAttribution(board.quoteSource, board.overlay, {
        fallbackReason: board.fallbackReason,
      }),
      indices,
      universeSize: rows.length,
      universeLabel: `Verified live board · ${rows.length} names`,
      breadth: breadthFromIndex ?? { ...ub, label: ub.label },
      universeBreadth: ub,
      volume: hose?.volume ?? rows.reduce((s, r) => s + (r.volume ?? 0), 0),
      turnover: hose?.turnover ?? rows.reduce((s, r) => s + (r.turnover ?? 0), 0),
      sectors: sectorSnapshots(rows),
      gainers: byChange.filter((r) => (r.changePct ?? 0) > 0).slice(0, 6),
      losers: [...byChange].reverse().filter((r) => (r.changePct ?? 0) < 0).slice(0, 6),
      active: byVol.slice(0, 6),
    };
  }

  async getPriceHistory(symbol: string, range: ChartRange): Promise<PricePoint[]> {
    const key = symbol.toUpperCase();
    const [hist, board] = await Promise.all([loadHistory(key), loadLiveBoard().catch(() => null)]);
    const last = board?.rows.find((r) => r.symbol === key)?.price ?? hist.points.at(-1)?.close ?? null;
    return sliceHistory(alignHistoryToLast(hist.points, last), range);
  }

  async getSecurity(symbol: string): Promise<SecurityDetail | null> {
    const key = symbol.toUpperCase();
    const identity = lookupIdentity(key);
    if (!identity) return null;
    const board = await loadLiveBoard();
    const row = board.rows.find((r) => r.symbol === key);
    if (!row) return null;
    const hist = await loadHistory(key);
    const last = row.price ?? hist.points.at(-1)?.close ?? null;
    const history = sliceHistory(alignHistoryToLast(hist.points, last), "ALL");
    const w = derive52w(history);
    const peers = board.rows.filter((r) => r.sector === row.sector && r.symbol !== key).slice(0, 4);
    const blurb = genericOverview(identity);
    return {
      attribution: liveAttribution(board.quoteSource, board.overlay, {
        fallbackReason: board.fallbackReason,
        historySourceId: hist.source,
        historyFallbackReason: hist.fallbackReason,
      }),
      identity,
      quote: row,
      fundamentals: { ...row, ...w },
      history,
      overview: blurb.en,
      overviewVi: blurb.vi,
      peers,
    };
  }
}
