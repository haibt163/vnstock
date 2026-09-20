import type {
  ChartRange,
  Fundamentals,
  PricePoint,
  Quote,
  ScreenerRow,
  SectorSnapshot,
  SecurityIdentity,
} from "./types.ts";

export function signedChange(last: number | null, ref: number | null) {
  if (last == null || ref == null || ref === 0) {
    return { change: null as number | null, changePct: null as number | null };
  }
  const change = last - ref;
  const changePct = (change / ref) * 100;
  const snapped = Math.abs(changePct) < 0.005 ? 0 : changePct;
  return { change: snapped === 0 ? 0 : change, changePct: snapped };
}

export const EMPTY_FUNDAMENTALS: Fundamentals = {
  marketCap: null,
  pe: null,
  pb: null,
  roe: null,
  dividendYield: null,
  eps: null,
  bookValue: null,
  debtToEquity: null,
  high52w: null,
  low52w: null,
  sharesOutstanding: null,
  revenueGrowth: null,
  profitGrowth: null,
};

export function quoteToRow(
  identity: SecurityIdentity,
  quote: Quote,
  fundamentals: Fundamentals = EMPTY_FUNDAMENTALS,
): ScreenerRow {
  return {
    ...identity,
    ...quote,
    ...fundamentals,
    averageVolume: null,
  };
}

/** Recompute price-dependent valuation from a live print + source snapshot. */
export function applyLiveValuation(base: Fundamentals, price: number | null): Fundamentals {
  const out = { ...base };
  if (price != null && price > 0) {
    if (base.sharesOutstanding != null && base.sharesOutstanding > 0) {
      out.marketCap = price * base.sharesOutstanding;
    }
    if (base.eps != null && base.eps !== 0) {
      out.pe = price / base.eps;
    }
    if (base.bookValue != null && base.bookValue !== 0) {
      out.pb = price / base.bookValue;
    }
  }
  return out;
}

export function rangeStart(range: ChartRange, now = Date.now()): number {
  const day = 86_400_000;
  switch (range) {
    case "1W":
      return now - 10 * day;
    case "1M":
      return now - 35 * day;
    case "3M":
      return now - 100 * day;
    case "6M":
      return now - 200 * day;
    case "1Y":
      return now - 400 * day;
    default:
      return now - 800 * day;
  }
}

export function sliceHistory(points: PricePoint[], range: ChartRange): PricePoint[] {
  const start = rangeStart(range);
  const sliced = points.filter((p) => p.time >= start);
  return sliced.length ? sliced : points.slice(-5);
}

export function alignHistoryToLast(points: PricePoint[], last: number | null): PricePoint[] {
  if (!points.length || last == null) return points;
  const copy = points.slice();
  const tail = copy[copy.length - 1];
  if (tail.close === last) return copy;
  copy[copy.length - 1] = {
    ...tail,
    close: last,
    high: Math.max(tail.high, last),
    low: Math.min(tail.low, last),
  };
  return copy;
}

export function derive52w(points: PricePoint[]): { high52w: number | null; low52w: number | null } {
  const yearAgo = Date.now() - 400 * 86_400_000;
  const window = points.filter((p) => p.time >= yearAgo);
  const src = window.length ? window : points;
  if (!src.length) return { high52w: null, low52w: null };
  return {
    high52w: Math.max(...src.map((p) => p.high)),
    low52w: Math.min(...src.map((p) => p.low)),
  };
}

export function sectorSnapshots(rows: ScreenerRow[]): SectorSnapshot[] {
  const map = new Map<string, ScreenerRow[]>();
  for (const row of rows) {
    const list = map.get(row.sector) ?? [];
    list.push(row);
    map.set(row.sector, list);
  }
  return [...map.entries()]
    .map(([sector, list]) => {
      const changes = list.map((r) => r.changePct).filter((v): v is number => v != null);
      const avg = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null;
      return {
        sector,
        count: list.length,
        avgChangePct: avg,
        advancers: list.filter((r) => (r.changePct ?? 0) > 0).length,
        decliners: list.filter((r) => (r.changePct ?? 0) < 0).length,
        unchanged: list.filter((r) => (r.changePct ?? 0) === 0 || r.changePct == null).length,
      };
    })
    .sort((a, b) => (b.avgChangePct ?? -999) - (a.avgChangePct ?? -999));
}

export function universeBreadth(rows: ScreenerRow[]) {
  let advances = 0;
  let declines = 0;
  let unchanged = 0;
  for (const row of rows) {
    const p = row.changePct;
    if (p == null || p === 0) unchanged += 1;
    else if (p > 0) advances += 1;
    else declines += 1;
  }
  return {
    scope: "universe" as const,
    label: `In this ${rows.length}-stock universe`,
    advances,
    declines,
    unchanged,
  };
}

export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}
