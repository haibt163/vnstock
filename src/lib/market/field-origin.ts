import type { DataMode, FieldOrigin, Fundamentals, Quote } from "./types.ts";

export type MetricId =
  | keyof Quote
  | keyof Fundamentals
  | "averageVolume"
  | "change"
  | "changePct";

const QUOTED: ReadonlySet<string> = new Set([
  "symbol",
  "price",
  "reference",
  "previousClose",
  "open",
  "high",
  "low",
  "volume",
  "turnover",
  "ceiling",
  "floor",
  "change",
  "changePct",
]);

const DERIVED: ReadonlySet<string> = new Set(["marketCap", "pe", "pb", "high52w", "low52w"]);

const SOURCE: ReadonlySet<string> = new Set([
  "roe",
  "dividendYield",
  "eps",
  "bookValue",
  "debtToEquity",
  "sharesOutstanding",
  "revenueGrowth",
  "profitGrowth",
  "averageVolume",
]);

export function fieldOrigin(metric: MetricId, value: unknown, mode: DataMode = "live"): FieldOrigin {
  if (value == null || value === "") return "unavailable";
  if (mode === "demo") return "source";
  if (DERIVED.has(metric)) return "derived";
  if (SOURCE.has(metric)) return "source";
  if (QUOTED.has(metric)) return "quoted";
  return "unavailable";
}
