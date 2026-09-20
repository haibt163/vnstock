import { createServerFn } from "@tanstack/react-start";
import { demoProvider, describeProvider, getMarketDataProvider } from "./factory.ts";
import type {
  ChartRange,
  MarketOverview,
  PricePoint,
  ScreenerRow,
  SecurityDetail,
} from "./types.ts";
import { ProviderError } from "./types.ts";

export type DashboardPayload = MarketOverview & {
  status: ReturnType<typeof describeProvider>;
  degraded: boolean;
};

async function safeLive<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<{ value: T; degraded: boolean }> {
  try {
    return { value: await fn(), degraded: false };
  } catch (err) {
    if (err instanceof ProviderError && err.code === "not_configured") {
      return { value: await fallback(), degraded: true };
    }
    console.error("[vnstock] live provider failed", err instanceof Error ? err.message : "error");
    return { value: await fallback(), degraded: true };
  }
}

export const getDashboard = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardPayload> => {
  const status = describeProvider();
  const live = getMarketDataProvider();
  const { value, degraded } = await safeLive(
    () => live.getMarketOverview(),
    () => demoProvider().getMarketOverview(),
  );
  if (degraded) {
    return {
      ...value,
      status: { ...status, mode: "demo", message: "Live board unavailable — showing demo data." },
      degraded: true,
      attribution: {
        ...value.attribution,
        mode: "demo",
        freshness: "DEMO",
        caveats: [
          "Live provider failed or is not configured. Figures below are simulated.",
          ...value.attribution.caveats,
        ],
      },
    };
  }
  return { ...value, status, degraded: false };
});

export const getScreenerRows = createServerFn({ method: "GET" }).handler(async (): Promise<{
  rows: ScreenerRow[];
  attribution: MarketOverview["attribution"];
  degraded: boolean;
}> => {
  const live = getMarketDataProvider();
  try {
    const [overview, rows] = await Promise.all([live.getMarketOverview(), live.getSecurities()]);
    return { rows, attribution: overview.attribution, degraded: false };
  } catch (err) {
    console.error("[vnstock] screener live failed", err instanceof Error ? err.message : "error");
    const demo = demoProvider();
    const [overview, rows] = await Promise.all([demo.getMarketOverview(), demo.getSecurities()]);
    return {
      rows,
      attribution: { ...overview.attribution, mode: "demo", freshness: "DEMO" },
      degraded: true,
    };
  }
});

export const getStockDetail = createServerFn({ method: "GET" })
  .validator((d: { symbol: string; range?: ChartRange }) => d)
  .handler(async ({ data }): Promise<SecurityDetail | null> => {
    const symbol = data.symbol.trim().toUpperCase();
    const live = getMarketDataProvider();
    try {
      const detail = await live.getSecurity(symbol);
      if (!detail) return null;
      if (data.range && data.range !== "ALL") {
        detail.history = await live.getPriceHistory(symbol, data.range);
      }
      return detail;
    } catch (err) {
      console.error("[vnstock] stock live failed", err instanceof Error ? err.message : "error");
      const demo = await demoProvider().getSecurity(symbol);
      if (!demo) return null;
      return {
        ...demo,
        attribution: { ...demo.attribution, mode: "demo", freshness: "DEMO" },
      };
    }
  });

export const getPriceSeries = createServerFn({ method: "GET" })
  .validator((d: { symbol: string; range: ChartRange }) => d)
  .handler(async ({ data }): Promise<PricePoint[]> => {
    const symbol = data.symbol.trim().toUpperCase();
    try {
      return await getMarketDataProvider().getPriceHistory(symbol, data.range);
    } catch {
      return demoProvider().getPriceHistory(symbol, data.range);
    }
  });

export const getProviderStatus = createServerFn({ method: "GET" }).handler(async () => describeProvider());
