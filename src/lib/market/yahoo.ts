import { yahooChartSchema } from "./schemas.ts";
import { mapPool, signedChange } from "./normalize.ts";
import type { IndexSnapshot, PricePoint, Quote } from "./types.ts";

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 VNStockScreener/1.0",
};

/**
 * Yahoo Finance `*.VN` chart prices are already in dong (e.g. VCB = 59500),
 * unlike the VPS board which quotes in thousands. Do not multiply.
 */
async function fetchChart(symbol: string, range: string): Promise<unknown | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchYahooHistory(symbol: string, range: string): Promise<PricePoint[]> {
  const json = await fetchChart(`${symbol}.VN`, range);
  if (!json) return [];
  const parsed = yahooChartSchema.safeParse(json);
  if (!parsed.success) return [];
  const result = parsed.data.chart.result?.[0];
  if (!result) return [];
  const ts = result.timestamp ?? [];
  const q = result.indicators.quote[0];
  const points: PricePoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null || !Number.isFinite(close)) continue;
    const time = ts[i] * 1000;
    points.push({
      time,
      date: new Date(time).toISOString().slice(0, 10),
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return points;
}

export interface YahooQuote extends Quote {
  high52w: number | null;
  low52w: number | null;
}

export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const json = await fetchChart(`${symbol}.VN`, "5d");
  if (!json) return null;
  const parsed = yahooChartSchema.safeParse(json);
  if (!parsed.success) return null;
  const result = parsed.data.chart.result?.[0];
  if (!result) return null;
  const m = result.meta;
  const last = m.regularMarketPrice ?? null;
  const ref = m.chartPreviousClose ?? m.previousClose ?? null;
  const { change, changePct } = signedChange(last, ref);
  if (last == null) return null;
  return {
    symbol: symbol.toUpperCase(),
    price: last,
    reference: ref,
    previousClose: ref,
    change,
    changePct: changePct ?? m.regularMarketChangePercent ?? null,
    open: null,
    high: m.regularMarketDayHigh ?? null,
    low: m.regularMarketDayLow ?? null,
    volume: m.regularMarketVolume ?? null,
    turnover: last != null && m.regularMarketVolume != null ? last * m.regularMarketVolume : null,
    ceiling: null,
    floor: null,
    high52w: m.fiftyTwoWeekHigh ?? null,
    low52w: m.fiftyTwoWeekLow ?? null,
  };
}

export async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const results = await mapPool(symbols, 6, fetchYahooQuote);
  return results.filter((q): q is YahooQuote => q != null);
}

export async function fetchYahooIndex(yahooSymbol: string, code: string, name: string): Promise<IndexSnapshot | null> {
  const json = await fetchChart(yahooSymbol, "5d");
  if (!json) return null;
  const parsed = yahooChartSchema.safeParse(json);
  if (!parsed.success) return null;
  const m = parsed.data.chart.result?.[0]?.meta;
  if (!m?.regularMarketPrice) return null;
  const last = m.regularMarketPrice;
  const ref = m.chartPreviousClose ?? m.previousClose ?? null;
  const { change, changePct } = signedChange(last, ref);
  return {
    code,
    name,
    value: last,
    change,
    changePct: changePct ?? m.regularMarketChangePercent ?? null,
    volume: m.regularMarketVolume ?? null,
    turnover: null,
    advances: null,
    declines: null,
    unchanged: null,
  };
}
