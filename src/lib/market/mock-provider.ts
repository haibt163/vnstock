import { genericOverview, UNIVERSE } from "./universe.ts";
import { makeAsOf, sessionPhaseAt } from "./session.ts";
import { seeded } from "./rng.ts";
import { applyScreenerFilters } from "./filters.ts";
import {
  alignHistoryToLast,
  derive52w,
  EMPTY_FUNDAMENTALS,
  quoteToRow,
  sectorSnapshots,
  sliceHistory,
  universeBreadth,
} from "./normalize.ts";
import type {
  ChartRange,
  DataAttribution,
  MarketDataProvider,
  MarketOverview,
  PricePoint,
  Quote,
  ScreenerFilters,
  ScreenerRow,
  SecurityDetail,
} from "./types.ts";

const UNIVERSE_SEED = "vnstock-demo-universe-v1";

function demoAttribution(): DataAttribution {
  const asOf = makeAsOf();
  const session = sessionPhaseAt();
  return {
    mode: "demo",
    sourceId: "mock",
    sourceLabel: "Deterministic demo fixture",
    freshness: "DEMO",
    asOfIso: asOf.asOfIso,
    asOfIct: asOf.asOfIct,
    session,
    caveats: [
      "These figures are simulated and are not market prices.",
      "Switch the live provider on to load current public-board quotes.",
    ],
  };
}

function basePrice(symbol: string): number {
  const rnd = seeded(`price:${UNIVERSE_SEED}:${symbol}`);
  const identity = UNIVERSE.find((s) => s.symbol === symbol);
  const sector = identity?.sector ?? "Banks";
  const anchors: Record<string, [number, number]> = {
    Banks: [18_000, 65_000],
    Financials: [16_000, 45_000],
    "Real Estate": [22_000, 120_000],
    Technology: [60_000, 95_000],
    Materials: [18_000, 40_000],
    Energy: [28_000, 95_000],
    Utilities: [10_000, 16_000],
    "Consumer Staples": [40_000, 80_000],
    "Consumer Discretionary": [55_000, 90_000],
    Industrials: [30_000, 130_000],
    Healthcare: [80_000, 110_000],
    Logistics: [45_000, 70_000],
    Telecom: [70_000, 110_000],
  };
  const [lo, hi] = anchors[sector] ?? [20_000, 60_000];
  const raw = lo + rnd() * (hi - lo);
  return Math.round(raw / 50) * 50;
}

function buildQuote(symbol: string): Quote {
  const rnd = seeded(`quote:${UNIVERSE_SEED}:${symbol}`);
  const reference = basePrice(symbol);
  const changePct = Math.round((rnd() * 6 - 3) * 100) / 100;
  const snapped = Math.abs(changePct) < 0.05 ? 0 : changePct;
  const price = Math.round((reference * (1 + snapped / 100)) / 50) * 50;
  const change = snapped === 0 ? 0 : price - reference;
  const volume = Math.round(200_000 + rnd() * 8_000_000);
  const high = Math.max(price, reference) + Math.round(rnd() * 400);
  const low = Math.min(price, reference) - Math.round(rnd() * 400);
  return {
    symbol,
    price,
    reference,
    previousClose: reference,
    change,
    changePct: snapped,
    open: Math.round((reference + (price - reference) * 0.3) / 50) * 50,
    high,
    low,
    volume,
    turnover: price * volume,
    ceiling: Math.round(reference * 1.07),
    floor: Math.round(reference * 0.93),
  };
}

function buildFundamentals(symbol: string, price: number) {
  const rnd = seeded(`fund:${UNIVERSE_SEED}:${symbol}`);
  const shares = Math.round((800_000_000 + rnd() * 6_000_000_000) / 1_000_000) * 1_000_000;
  const pe = Math.round((8 + rnd() * 22) * 10) / 10;
  const pb = Math.round((0.8 + rnd() * 3.2) * 100) / 100;
  return {
    ...EMPTY_FUNDAMENTALS,
    marketCap: shares * price,
    pe,
    pb,
    roe: Math.round((8 + rnd() * 22) * 10) / 10,
    dividendYield: Math.round(rnd() * 4.5 * 10) / 10,
    eps: Math.round(price / pe),
    bookValue: Math.round(price / pb),
    debtToEquity: Math.round((0.2 + rnd() * 1.6) * 100) / 100,
    sharesOutstanding: shares,
    revenueGrowth: Math.round((rnd() * 30 - 5) * 10) / 10,
    profitGrowth: Math.round((rnd() * 30 - 8) * 10) / 10,
  };
}

function buildHistory(symbol: string, last: number, days = 260): PricePoint[] {
  const rnd = seeded(`hist:${UNIVERSE_SEED}:${symbol}`);
  const points: PricePoint[] = [];
  let close = last;
  const now = new Date();
  now.setUTCHours(7, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const vol = Math.round(150_000 + rnd() * 6_000_000);
    const open = close;
    const high = open + Math.round(rnd() * open * 0.025);
    const low = open - Math.round(rnd() * open * 0.025);
    points.push({
      time: d.getTime(),
      date: d.toISOString().slice(0, 10),
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume: vol,
    });
    const step = 1 + (rnd() - 0.5) * 0.04;
    close = Math.max(1000, Math.round(close / step / 50) * 50);
  }
  return points.reverse();
}

let cachedRows: ScreenerRow[] | null = null;
const histCache = new Map<string, PricePoint[]>();

function rows(): ScreenerRow[] {
  if (cachedRows) return cachedRows;
  cachedRows = UNIVERSE.map((id) => {
    const quote = buildQuote(id.symbol);
    const hist = buildHistory(id.symbol, quote.price ?? 0);
    histCache.set(id.symbol, hist);
    const w = derive52w(hist);
    return quoteToRow(id, quote, { ...buildFundamentals(id.symbol, quote.price ?? 0), ...w });
  });
  return cachedRows;
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = "mock" as const;

  async getSecurities(filters?: ScreenerFilters): Promise<ScreenerRow[]> {
    return applyScreenerFilters(rows(), filters);
  }

  async getIndices() {
    const rnd = seeded(`indices:${UNIVERSE_SEED}`);
    const mk = (code: string, name: string, base: number) => {
      const changePct = Math.round((rnd() * 1.6 - 0.7) * 100) / 100;
      const value = Math.round(base * (1 + changePct / 100) * 100) / 100;
      return {
        code,
        name,
        value,
        change: Math.round((value - base) * 100) / 100,
        changePct,
        volume: Math.round(80_000_000 + rnd() * 200_000_000),
        turnover: Math.round((8 + rnd() * 12) * 1_000_000_000_000),
        advances: 0,
        declines: 0,
        unchanged: 0,
      };
    };
    return [
      mk("VNINDEX", "VN-Index", 1280),
      mk("VN30", "VN30", 1420),
      mk("HNXINDEX", "HNX-Index", 240),
      mk("UPCOMINDEX", "UPCoM-Index", 95),
    ];
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const list = rows();
    const breadth = universeBreadth(list);
    const byChange = [...list].sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999));
    const byVol = [...list].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    const indices = await this.getIndices();
    indices[0] = { ...indices[0], advances: breadth.advances, declines: breadth.declines, unchanged: breadth.unchanged };
    return {
      attribution: demoAttribution(),
      indices,
      universeSize: list.length,
      universeLabel: `Demo universe · ${list.length} names`,
      breadth: { ...breadth, scope: "universe", label: "Derived from demo universe" },
      universeBreadth: breadth,
      volume: list.reduce((s, r) => s + (r.volume ?? 0), 0),
      turnover: list.reduce((s, r) => s + (r.turnover ?? 0), 0),
      sectors: sectorSnapshots(list),
      gainers: byChange.filter((r) => (r.changePct ?? 0) > 0).slice(0, 5),
      losers: [...byChange].reverse().filter((r) => (r.changePct ?? 0) < 0).slice(0, 5),
      active: byVol.slice(0, 5),
    };
  }

  async getPriceHistory(symbol: string, range: ChartRange): Promise<PricePoint[]> {
    const key = symbol.toUpperCase();
    const list = histCache.get(key) ?? buildHistory(key, basePrice(key));
    const row = rows().find((r) => r.symbol === key);
    return sliceHistory(alignHistoryToLast(list, row?.price ?? null), range);
  }

  async getSecurity(symbol: string): Promise<SecurityDetail | null> {
    const key = symbol.toUpperCase();
    const row = rows().find((r) => r.symbol === key);
    if (!row) return null;
    const history = await this.getPriceHistory(key, "ALL");
    const peers = rows()
      .filter((r) => r.sector === row.sector && r.symbol !== key)
      .slice(0, 4);
    const blurb = genericOverview(row);
    return {
      attribution: demoAttribution(),
      identity: {
        symbol: row.symbol,
        name: row.name,
        nameVi: row.nameVi,
        exchange: row.exchange,
        sector: row.sector,
        vn30: row.vn30,
        group: row.group,
      },
      quote: row,
      fundamentals: row,
      history,
      overview: blurb.en,
      overviewVi: blurb.vi,
      peers,
    };
  }
}
