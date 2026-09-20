/**
 * Simplize public company snapshot.
 * EOD/snapshot ratios (P/E, P/B, ROE, shares, growth). Not an official
 * exchange fundamental feed; usage rights for third-party apps are unclear.
 * Used only as a labelled overlay on top of live quotes — never as a LIVE badge.
 */
import { asNumber, simplizeSummarySchema } from "./schemas.ts";
import { cached } from "./cache.ts";
import { mapPool } from "./normalize.ts";
import type { Fundamentals } from "./types.ts";

const URL = "https://api.simplize.vn/api/company/summary";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "VNStockScreener/1.0 (research)",
};
const TTL = 30 * 60_000;

export interface SimplizeSnapshot extends Fundamentals {
  asOf: string | null;
  averageVolume: number | null;
}

function parseAsOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return raw;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export async function fetchSimplizeSummary(symbol: string): Promise<SimplizeSnapshot | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${URL}/${encodeURIComponent(symbol)}`, {
      headers: HEADERS,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const parsed = simplizeSummarySchema.safeParse(json);
    if (!parsed.success) return null;
    const d = parsed.data.data;
    if (!d) return null;
    return {
      marketCap: asNumber(d.marketCap),
      pe: asNumber(d.peRatio),
      pb: asNumber(d.pbRatio),
      roe: asNumber(d.roe),
      dividendYield: asNumber(d.dividendYieldCurrent),
      eps: asNumber(d.epsRatio),
      bookValue: asNumber(d.bookValue),
      debtToEquity: null,
      high52w: null,
      low52w: null,
      sharesOutstanding: asNumber(d.outstandingSharesValue),
      revenueGrowth: asNumber(d.revenueLtmGrowth),
      profitGrowth: asNumber(d.netIncomeLtmGrowth),
      asOf: parseAsOf(d.analysisUpdated),
      averageVolume: asNumber(d.volume10dAvg),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchSimplizeSummaries(symbols: string[]): Promise<Map<string, SimplizeSnapshot>> {
  return cached("simplize:summaries", TTL, async () => {
    const map = new Map<string, SimplizeSnapshot>();
    await mapPool(symbols, 10, async (sym) => {
      const snap = await fetchSimplizeSummary(sym);
      if (snap) map.set(sym, snap);
    });
    return map;
  });
}
