import { z } from "zod";

const finite = z.number().finite();
const nullableFinite = finite.nullable();
/** Board fields arrive as numbers, numeric strings, or null while a name is unopened. */
const boardNum = z.union([finite, z.string()]).nullish();

export const vpsQuoteSchema = z
  .object({
    sym: z.string(),
    lastPrice: boardNum,
    r: boardNum,
    c: boardNum,
    f: boardNum,
    ot: boardNum,
    changePc: boardNum,
    lot: boardNum,
    openPrice: boardNum,
    highPrice: boardNum,
    lowPrice: boardNum,
    closePrice: boardNum,
    avePrice: boardNum,
    marketId: z.string().optional().nullable(),
    sType: z.string().optional().nullable(),
  })
  .passthrough();

export const vpsQuoteArraySchema = z.array(vpsQuoteSchema);

export const vpsIndexSchema = z
  .object({
    mc: z.union([z.string(), finite]).optional(),
    cIndex: finite.optional().nullable(),
    oIndex: finite.optional().nullable(),
    vol: finite.optional().nullable(),
    value: finite.optional().nullable(),
    time: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    ot: z.string().optional().nullable(),
  })
  .passthrough();

export const vpsHistSchema = z.object({
  s: z.string().optional(),
  t: z.array(finite).optional().nullable(),
  o: z.array(finite.nullable()).optional().nullable(),
  h: z.array(finite.nullable()).optional().nullable(),
  l: z.array(finite.nullable()).optional().nullable(),
  c: z.array(finite.nullable()).optional().nullable(),
  v: z.array(finite.nullable()).optional().nullable(),
});

export const yahooChartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z
            .object({
              regularMarketPrice: finite.optional(),
              chartPreviousClose: finite.optional(),
              previousClose: finite.optional(),
              regularMarketTime: finite.optional(),
              regularMarketVolume: finite.optional(),
              regularMarketDayHigh: finite.optional(),
              regularMarketDayLow: finite.optional(),
              fiftyTwoWeekHigh: finite.optional(),
              fiftyTwoWeekLow: finite.optional(),
              symbol: z.string().optional(),
              currency: z.string().optional(),
              shortName: z.string().optional(),
              longName: z.string().optional(),
              regularMarketChangePercent: finite.optional(),
            })
            .passthrough(),
          timestamp: z.array(finite).optional(),
          indicators: z
            .object({
              quote: z.array(
                z.object({
                  open: z.array(nullableFinite).optional(),
                  high: z.array(nullableFinite).optional(),
                  low: z.array(nullableFinite).optional(),
                  close: z.array(nullableFinite).optional(),
                  volume: z.array(nullableFinite).optional(),
                }),
              ),
            })
            .passthrough(),
        }),
      )
      .nullable(),
    error: z.unknown().optional().nullable(),
  }),
});

export const simplizeSummarySchema = z.object({
  status: z.number().optional(),
  data: z
    .object({
      ticker: z.string().optional(),
      marketCap: z.union([finite, z.string()]).optional().nullable(),
      outstandingSharesValue: z.union([finite, z.string()]).optional().nullable(),
      peRatio: z.union([finite, z.string()]).optional().nullable(),
      pbRatio: z.union([finite, z.string()]).optional().nullable(),
      epsRatio: z.union([finite, z.string()]).optional().nullable(),
      bookValue: z.union([finite, z.string()]).optional().nullable(),
      dividendYieldCurrent: z.union([finite, z.string()]).optional().nullable(),
      roe: z.union([finite, z.string()]).optional().nullable(),
      revenueLtmGrowth: z.union([finite, z.string()]).optional().nullable(),
      netIncomeLtmGrowth: z.union([finite, z.string()]).optional().nullable(),
      volume10dAvg: z.union([finite, z.string()]).optional().nullable(),
      analysisUpdated: z.string().optional().nullable(),
      stockExchange: z.string().optional().nullable(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

export function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
