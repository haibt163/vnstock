import type { ScreenerFilters, ScreenerRow, ScreenerSortKey } from "./types.ts";

function inRange(value: number | null, min?: number, max?: number): boolean {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function applyScreenerFilters(
  rows: ScreenerRow[],
  filters: ScreenerFilters = {},
): ScreenerRow[] {
  const q = filters.query?.trim().toLowerCase();
  return rows.filter((row) => {
    if (q) {
      const blob = `${row.symbol} ${row.name} ${row.nameVi}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (filters.vn30Only && !row.vn30) return false;
    if (filters.exchanges?.length && !filters.exchanges.includes(row.exchange)) {
      return false;
    }
    if (filters.sectors?.length && !filters.sectors.includes(row.sector)) {
      return false;
    }
    if (!inRange(row.price, filters.minPrice, filters.maxPrice)) return false;
    if (!inRange(row.changePct, filters.minChangePct, filters.maxChangePct)) return false;
    if (!inRange(row.marketCap, filters.minMarketCap, filters.maxMarketCap)) return false;
    if (!inRange(row.pe, filters.minPe, filters.maxPe)) return false;
    if (!inRange(row.pb, filters.minPb, filters.maxPb)) return false;
    if (filters.minRoe != null && (row.roe == null || row.roe < filters.minRoe)) return false;
    if (
      filters.minDividendYield != null &&
      (row.dividendYield == null || row.dividendYield < filters.minDividendYield)
    ) {
      return false;
    }
    if (filters.minVolume != null && (row.volume == null || row.volume < filters.minVolume)) {
      return false;
    }
    return true;
  });
}

export function sortScreenerRows(
  rows: ScreenerRow[],
  key: ScreenerSortKey = "symbol",
  direction: "asc" | "desc" = "asc",
): ScreenerRow[] {
  const dir = direction === "asc" ? 1 : -1;
  const copy = rows.slice();
  copy.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return a.symbol.localeCompare(b.symbol);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      const cmp = av.localeCompare(bv);
      return cmp === 0 ? a.symbol.localeCompare(b.symbol) : cmp * dir;
    }
    const an = Number(av);
    const bn = Number(bv);
    const cmp = an === bn ? 0 : an < bn ? -1 : 1;
    return cmp === 0 ? a.symbol.localeCompare(b.symbol) : cmp * dir;
  });
  return copy;
}

export const PRESETS: { id: string; label: string; filters: ScreenerFilters }[] = [
  { id: "all", label: "All", filters: {} },
  { id: "vn30", label: "VN30", filters: { vn30Only: true } },
  { id: "hose", label: "HOSE", filters: { exchanges: ["HOSE"] } },
  { id: "hnx", label: "HNX", filters: { exchanges: ["HNX"] } },
  { id: "upcom", label: "UPCoM", filters: { exchanges: ["UPCoM"] } },
  { id: "banks", label: "Banks", filters: { sectors: ["Banks"] } },
  { id: "realestate", label: "Real estate", filters: { sectors: ["Real Estate"] } },
  { id: "tech", label: "Technology", filters: { sectors: ["Technology"] } },
  { id: "gainers", label: "Gainers", filters: { minChangePct: 0.01 } },
  { id: "losers", label: "Losers", filters: { maxChangePct: -0.01 } },
];
