import { asNumber, vpsHistSchema, vpsIndexSchema, vpsQuoteSchema } from "./schemas.ts";
import type { Exchange, IndexSnapshot, PricePoint } from "./types.ts";
export { fallbackReasonTag } from "./fallback-reason.ts";

const QUOTE_URL = "https://bgapidatafeed.vps.com.vn/getliststockdata";
const INDEX_URL = "https://bgapidatafeed.vps.com.vn/getlistindexdetail";
const HIST_URL = "https://histdatafeed.vps.com.vn/tradingview/history";
/** Quotes share the index budget: VPS occasionally takes 13–14s while still returning a valid board. */
const QUOTE_TIMEOUT_MS = 15_000;

const HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "User-Agent": "VNStockScreener/1.0 (research; +https://grok.me)",
};

export const VPS_INDEX_MAP: Record<string, { code: string; name: string }> = {
  "10": { code: "VNINDEX", name: "VN-Index" },
  "11": { code: "VN30", name: "VN30" },
  "02": { code: "HNXINDEX", name: "HNX-Index" },
  "03": { code: "UPCOMINDEX", name: "UPCoM-Index" },
};

export interface VpsQuote {
  symbol: string;
  last: number | null;
  reference: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  ceiling: number | null;
  floor: number | null;
  exchange: Exchange | null;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (res.status === 429) {
      const err = new Error("rate_limited");
      err.name = "RateLimited";
      throw err;
    }
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
      const e = new Error("timeout");
      e.name = "Timeout";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

export function classifyFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "Timeout" || err.name === "AbortError" || err.message === "timeout") return "timeout";
    if (err.name === "RateLimited" || err.message === "rate_limited") return "rate_limited";
    if (err.message.startsWith("http_")) return err.message;
    if (err.message === "invalid_vps_quotes") return "invalid_schema";
    return err.message.slice(0, 160);
  }
  return "unknown";
}

/** VPS equity board quotes in thousands of dong (59.5 → 59,500). */
export function boardPriceToVnd(boardPrice: number | null): number | null {
  if (boardPrice == null) return null;
  if (boardPrice === 0) return 0;
  return Math.round(boardPrice * 1000 * 100) / 100;
}

/** VPS `lot` matches historical `v` when multiplied by 10 (share units). */
export function boardLotToShares(lot: number | null): number | null {
  if (lot == null) return null;
  return Math.round(lot * 10);
}

function exchangeFromMarketId(id: string | null | undefined): Exchange | null {
  if (id === "STO") return "HOSE";
  if (id === "STX") return "HNX";
  if (id === "UPX") return "UPCoM";
  return null;
}

export async function fetchVpsQuotes(symbols: string[]): Promise<VpsQuote[]> {
  if (symbols.length === 0) return [];
  const raw = await fetchJson(`${QUOTE_URL}/${symbols.join(",")}`, QUOTE_TIMEOUT_MS);
  return parseVpsQuotePayload(raw);
}

/**
 * Accept a VPS board array without failing the whole universe on one unopened name.
 * A missing last print maps to last=null; callers skip those rows.
 */
export function parseVpsQuotePayload(raw: unknown): VpsQuote[] {
  if (!Array.isArray(raw)) throw new Error("invalid_vps_quotes");
  const out: VpsQuote[] = [];
  let rejected = 0;
  for (const row of raw) {
    const parsed = vpsQuoteSchema.safeParse(row);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }
    const mapped = mapVpsQuoteRow(parsed.data as { sym: string } & Record<string, unknown>);
    if (mapped) out.push(mapped);
  }
  if (out.length === 0) throw new Error("invalid_vps_quotes");
  if (rejected > 0) {
    console.warn("[vnstock] VPS skipped malformed rows", rejected, "of", raw.length);
  }
  return out;
}

function mapVpsQuoteRow(row: { sym: string } & Record<string, unknown>): VpsQuote | null {
  const symbol = row.sym?.toUpperCase();
  if (!symbol) return null;
  const lastBoard = asNumber(row.lastPrice);
  const refBoard = asNumber(row.r);
  const closeFull = asNumber(row.closePrice);
  const previousClose =
    closeFull != null && closeFull > 1000 ? closeFull : boardPriceToVnd(refBoard);
  const lot = asNumber(row.lot);
  return {
    symbol,
    last: lastBoard != null && lastBoard > 0 ? boardPriceToVnd(lastBoard) : null,
    reference: boardPriceToVnd(refBoard),
    previousClose,
    open: boardPriceToVnd(asNumber(row.openPrice)),
    high: boardPriceToVnd(asNumber(row.highPrice)),
    low: boardPriceToVnd(asNumber(row.lowPrice)),
    volume: boardLotToShares(lot),
    ceiling: boardPriceToVnd(asNumber(row.c)),
    floor: boardPriceToVnd(asNumber(row.f)),
    exchange: exchangeFromMarketId(typeof row.marketId === "string" ? row.marketId : null),
  };
}

export function parseIndexOt(ot: string | null | undefined) {
  if (!ot) return null;
  const parts = ot.split("|");
  if (parts.length < 6) return null;
  const change = asNumber(parts[0]);
  const changePct = asNumber(parts[1].replace("%", ""));
  const valueMn = asNumber(parts[2]);
  const advances = asNumber(parts[3]);
  const declines = asNumber(parts[4]);
  const unchanged = asNumber(parts[5]);
  return { change, changePct, valueMn, advances, declines, unchanged };
}

export async function fetchVpsIndex(code: string): Promise<IndexSnapshot | null> {
  const meta = VPS_INDEX_MAP[code];
  if (!meta) return null;
  const raw = await fetchJson(`${INDEX_URL}/${code}`, 15_000);
  const arr = Array.isArray(raw) ? raw : [raw];
  const first = arr.find((x) => x != null);
  const parsed = vpsIndexSchema.safeParse(first);
  if (!parsed.success) return null;
  const row = parsed.data;
  const ot = parseIndexOt(row.ot);
  const value = row.cIndex ?? null;
  const open = row.oIndex ?? null;
  const change =
    ot?.change ?? (value != null && open != null ? value - open : null);
  const changePct =
    ot?.changePct ?? (value != null && open ? ((value - open) / open) * 100 : null);
  return {
    code: meta.code,
    name: meta.name,
    value,
    change,
    changePct,
    volume: row.vol ?? null,
    turnover: ot?.valueMn != null ? ot.valueMn * 1_000_000 : row.value != null ? row.value * 1_000_000 : null,
    advances: ot?.advances ?? null,
    declines: ot?.declines ?? null,
    unchanged: ot?.unchanged ?? null,
  };
}

export async function fetchVpsHistory(symbol: string, fromUnix: number, toUnix: number): Promise<PricePoint[]> {
  const url = `${HIST_URL}?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${fromUnix}&to=${toUnix}`;
  const raw = await fetchJson(url, 10000);
  const parsed = vpsHistSchema.safeParse(raw);
  if (!parsed.success || parsed.data.s === "error") return [];
  const t = parsed.data.t ?? [];
  const o = parsed.data.o ?? [];
  const h = parsed.data.h ?? [];
  const l = parsed.data.l ?? [];
  const c = parsed.data.c ?? [];
  const v = parsed.data.v ?? [];
  const points: PricePoint[] = [];
  for (let i = 0; i < t.length; i++) {
    const closeBoard = c[i];
    if (closeBoard == null || !Number.isFinite(closeBoard)) continue;
    const close = boardPriceToVnd(closeBoard);
    if (close == null) continue;
    const ts = t[i] * 1000;
    points.push({
      time: ts,
      date: new Date(ts).toISOString().slice(0, 10),
      open: boardPriceToVnd(o[i] ?? closeBoard) ?? close,
      high: boardPriceToVnd(h[i] ?? closeBoard) ?? close,
      low: boardPriceToVnd(l[i] ?? closeBoard) ?? close,
      close,
      volume: v[i] ?? 0,
    });
  }
  return points;
}
