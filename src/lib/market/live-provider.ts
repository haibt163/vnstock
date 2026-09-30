import { genericOverview, UNCLASSIFIED_SECTOR, UNIVERSE_BY_SYMBOL, VN30_SOURCE } from "./universe.ts";
import { loadSecurityUniverse, type SecurityUniverse } from "./universe-feed.ts";
import { collectQuoteBatches, VPS_QUOTE_BATCH_SIZE } from "./quote-batch.ts";
import { cached } from "./cache.ts";
import { applyScreenerFilters } from "./filters.ts";
import { isMarketOpen, makeAsOf, sessionPhaseAt } from "./session.ts";
import { fetchVpsHistory, fetchVpsIndex, fetchVpsQuotes, classifyFetchError } from "./vps.ts";
import type { VpsQuote } from "./vps.ts";
import { fetchYahooHistory, fetchYahooIndex, fetchYahooQuotes } from "./yahoo.ts";
import { fetchSimplizeSummaries, type SimplizeSnapshot } from "./simplize.ts";
import {
  alignHistoryToLast,
  applyLiveValuation,
  derive52w,
  EMPTY_FUNDAMENTALS,
  emptyQuote,
  hasLastPrint,
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
  SecurityIdentity,
} from "./types.ts";
import { ProviderError } from "./types.ts";

const QUOTE_TTL = 60_000;
const INDEX_TTL = 20_000;
const HIST_TTL = 5 * 60_000;
const OVERLAY_WAIT_MS = 6_000;

type QuoteSource = "vps" | "yahoo";

interface QuoteBundle {
  rows: ScreenerRow[];
  quoteSource: QuoteSource;
  fallbackReason?: string;
  failedBatches: number;
  universe: SecurityUniverse;
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
  universe: SecurityUniverse,
  partial?: Partial<DataAttribution> & { failedBatches?: number },
): DataAttribution {
  const asOf = makeAsOf();
  const session = sessionPhaseAt();
  const open = isMarketOpen(session);
  const delayed = quoteSource === "yahoo";
  const vn30Note =
    universe.vn30Source === "vps"
      ? "VN30 membership from VPS getlistckindex/vn30 (same host as the board). Not implied for the rest of the list."
      : `VN30 membership as of ${VN30_SOURCE.asOf} via ${VN30_SOURCE.name} (listing feed unavailable).`;
  const caveats = [
    delayed
      ? "Quotes from Yahoo Finance (delayed *.VN chart). Not an official HOSE/HNX feed."
      : "Public broker board, not an official HOSE/HNX feed.",
    "Not a substitute for licensed real-time market data.",
    universe.scope === "vps-board"
      ? `Listed universe from VPS getlistckindex (HOSE ${universe.counts.HOSE}, HNX ${universe.counts.HNX}, UPCoM ${universe.counts.UPCoM}). Names without a last print stay listed with blank quote fields. They are not priced at 0 and are not counted in breadth, gainers, or volume.`
      : "VPS listing endpoints failed. Universe fell back to the curated 69 names.",
    "Sectors and the curated company names cover the previous 69-name set only. Other names use the VPS master name and have no sector.",
    "EOD valuation is requested only for that curated set. Simplize is not fanned out across the full board.",
    overlay.covered > 0
      ? "Valuation overlay: market cap = live price × shares; P/E = price / EPS; P/B = price / book. Shares, EPS, book, ROE, yield and growth come from a Simplize EOD snapshot (not an official exchange feed; usage rights unclear)."
      : "P/E, P/B, ROE, dividend yield and market cap are omitted when the EOD overlay is unavailable.",
    vn30Note,
  ];
  if (partial?.failedBatches) {
    caveats.unshift(`VPS quote batches incomplete (${partial.failedBatches} failed). Rows already received were kept. Yahoo was not mixed into the gaps.`);
  }
  if (delayed && partial?.fallbackReason) {
    caveats.unshift(`VPS board skipped (${partial.fallbackReason}); serving delayed Yahoo *.VN for a capped HOSE set, not the full board.`);
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
    fallbackReason: partial?.fallbackReason,
    historySourceId: partial?.historySourceId,
    historyFallbackReason: partial?.historyFallbackReason,
  };
}

function vpsRow(id: SecurityIdentity, q: VpsQuote): ScreenerRow {
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

/** Quoted rows keep the board print. Listed names with no last print stay, with null quote fields. */
export function rowsFromVpsQuotes(identities: SecurityIdentity[], quotes: VpsQuote[]): ScreenerRow[] {
  const bySym = new Map(quotes.map((q) => [q.symbol, q]));
  const rows: ScreenerRow[] = [];
  for (const id of identities) {
    const q = bySym.get(id.symbol);
    if (q && q.last != null && q.last > 0) rows.push(vpsRow(id, q));
    else rows.push(quoteToRow(id, emptyQuote(id.symbol)));
  }
  return rows;
}

/** A discovered identity resolves even when the board has no usable last print. */
export function resolveListedSecurity(
  identities: readonly SecurityIdentity[],
  rows: readonly ScreenerRow[],
  symbol: string,
): { identity: SecurityIdentity; row: ScreenerRow } | null {
  const key = symbol.trim().toUpperCase();
  const identity = identities.find((s) => s.symbol === key);
  if (!identity) return null;
  const row = rows.find((r) => r.symbol === key) ?? quoteToRow(identity, emptyQuote(key));
  return { identity, row };
}

function yahooFallbackIds(universe: SecurityUniverse): SecurityIdentity[] {
  if (universe.scope === "curated-fallback") return universe.identities;
  // Full-board Yahoo would be hundreds of *.VN calls, and HNX/UPCoM 404.
  // On a total VPS failure, delayed quotes cover the curated HOSE names only.
  return universe.identities.filter((id) => id.exchange === "HOSE" && UNIVERSE_BY_SYMBOL[id.symbol]);
}

async function loadQuoteBundle(universe: SecurityUniverse): Promise<QuoteBundle> {
  const key = `quotes:${universe.scope}:${universe.identities.length}`;
  return cached(key, QUOTE_TTL, async () => {
    const symbols = universe.identities.map((id) => id.symbol);
    const batched = await collectQuoteBatches(symbols, VPS_QUOTE_BATCH_SIZE, fetchVpsQuotes);
    const rows = rowsFromVpsQuotes(universe.identities, batched.quotes);
    const quoted = rows.filter(hasLastPrint).length;
    console.info(
      "[vnstock] vps quotes",
      `batches ${batched.okBatches} ok / ${batched.failedBatches} failed`,
      `rows ${batched.quotes.length}`,
      `last ${quoted}`,
      `listed ${rows.length}`,
      batched.stoppedEarly ? "stopped-on-timeout" : "complete",
    );
    if (batched.okBatches > 0) {
      return { rows, quoteSource: "vps" as const, failedBatches: batched.failedBatches, universe };
    }
    const fallbackReason =
      batched.okBatches === 0
        ? "vps_batches_failed"
        : `vps_no_usable_last (payload=${batched.quotes.length})`;
    console.warn("[vnstock] VPS returned no usable last prints", fallbackReason);

    const fallbackIds = yahooFallbackIds(universe);
    const yahoo = await fetchYahooQuotes(fallbackIds.map((id) => id.symbol));
    const bySym = new Map(yahoo.map((q) => [q.symbol, q]));
    const yahooRows: ScreenerRow[] = [];
    for (const id of fallbackIds) {
      const q = bySym.get(id.symbol);
      if (!q || q.price == null || q.price <= 0) continue;
      yahooRows.push(
        quoteToRow(id, q, {
          ...EMPTY_FUNDAMENTALS,
          high52w: q.high52w,
          low52w: q.low52w,
        }),
      );
    }
    if (yahooRows.length === 0) {
      throw new ProviderError("unavailable", "VPS and Yahoo both returned no usable quotes.");
    }
    return {
      rows: yahooRows,
      quoteSource: "yahoo" as const,
      fallbackReason,
      failedBatches: batched.failedBatches,
      universe,
    };
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
  const targets = rows.filter((row) => UNIVERSE_BY_SYMBOL[row.symbol]);
  if (targets.length === 0) return { rows, covered: 0, asOf: null };
  try {
    const map = await withTimeout(
      fetchSimplizeSummaries(targets.map((r) => r.symbol)),
      OVERLAY_WAIT_MS,
    );
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
  const universe = await loadSecurityUniverse();
  const bundle = await loadQuoteBundle(universe);
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
    const quotedRows = rows.filter(hasLastPrint);
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
    const ub = universeBreadth(quotedRows);
    const byChange = [...quotedRows].sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999));
    const byVol = [...quotedRows].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    const listed = board.universe.counts.HOSE + board.universe.counts.HNX + board.universe.counts.UPCoM;
    return {
      attribution: liveAttribution(board.quoteSource, board.overlay, board.universe, {
        fallbackReason: board.fallbackReason,
        failedBatches: board.failedBatches,
      }),
      indices,
      universeSize: quotedRows.length,
      universeLabel:
        board.quoteSource === "yahoo"
          ? `Delayed Yahoo · ${quotedRows.length} names`
          : board.universe.scope === "vps-board"
            ? `${quotedRows.length} with a last print · ${listed} listed`
            : `Curated fallback · ${quotedRows.length} with a last print · ${rows.length} listed`,
      breadth: breadthFromIndex ?? { ...ub, label: ub.label },
      universeBreadth: ub,
      volume: hose?.volume ?? quotedRows.reduce((s, r) => s + (r.volume ?? 0), 0),
      turnover: hose?.turnover ?? quotedRows.reduce((s, r) => s + (r.turnover ?? 0), 0),
      sectors: sectorSnapshots(quotedRows.filter((r) => r.sector !== UNCLASSIFIED_SECTOR)),
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
    const board = await loadLiveBoard();
    const resolved = resolveListedSecurity(board.universe.identities, board.rows, symbol);
    if (!resolved) return null;
    const { identity, row } = resolved;
    const key = identity.symbol;
    const hist = await loadHistory(key);
    const last = row.price ?? hist.points.at(-1)?.close ?? null;
    const history = sliceHistory(alignHistoryToLast(hist.points, last), "ALL");
    const w = derive52w(history);
    const peers =
      row.sector === UNCLASSIFIED_SECTOR
        ? []
        : board.rows.filter((r) => r.sector === row.sector && r.symbol !== key && hasLastPrint(r)).slice(0, 4);
    const blurb = genericOverview(identity);
    return {
      attribution: liveAttribution(board.quoteSource, board.overlay, board.universe, {
        fallbackReason: board.fallbackReason,
        failedBatches: board.failedBatches,
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
