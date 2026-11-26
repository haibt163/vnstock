/**
 * Simplize public company snapshot.
 * EOD/snapshot ratios (P/E, P/B, ROE, shares, growth). Not an official
 * exchange fundamental feed; usage rights for third-party apps are unclear.
 * Used only as a labelled overlay on top of live quotes — never as a LIVE badge.
 *
 * Sector fields (bcEconomicSectorName, bcIndustryGroupType, industryActivity, …)
 * are present in live responses (see docs/DATA_PROVIDERS.md probe). Mapped
 * only to existing app sector names; unmapped stay unavailable.
 *
 * Two caches, deliberately separate:
 * - Fundamentals (valuation): 30-minute whole-map cache, used only for the curated 69.
 * - Sector mapping: per-symbol store with a long TTL. Advances on every call
 *   (bounded), independent of the fundamentals cache. Resets on process restart.
 */
import { asNumber, simplizeSummarySchema } from "./schemas.ts";
import { cached } from "./cache.ts";
import { mapPool } from "./normalize.ts";
import { UNCLASSIFIED_SECTOR } from "./universe.ts";
import type { Fundamentals } from "./types.ts";

const URL = "https://api.simplize.vn/api/company/summary";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "VNStockScreener/1.0 (research)",
};
/** Fundamentals overlay TTL. Unchanged from main. */
const TTL = 30 * 60_000;
/** Sector labels change rarely. Long TTL, separate from the 30-min fundamentals cache. */
export const SECTOR_TTL_MS = 24 * 60 * 60 * 1000;
/** Max new sector requests per call. Keeps work inside the overlay timeout and avoids storms. */
export const MAX_SECTOR_FETCH_PER_CALL = 40;

export interface SimplizeSnapshot extends Fundamentals {
  asOf: string | null;
  averageVolume: number | null;
  /** App sector derived from Simplize fields, or UNCLASSIFIED_SECTOR if unmapped. */
  mappedSector: string;
}

function parseAsOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return raw;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Map Simplize sector fields to the app's existing sector names.
 * Explicit table only; anything that does not match cleanly returns UNCLASSIFIED_SECTOR.
 * Evidence: live /api/company/summary responses (2026-11-26).
 */
export function mapSimplizeSector(d: Record<string, unknown>): string {
  const sector = String(d.bcEconomicSectorName ?? "").trim();
  const type = String(d.bcIndustryGroupType ?? "").trim().toUpperCase();
  const activity = String(d.industryActivity ?? "").toLowerCase();
  const slug = String(d.bcIndustryGroupSlug ?? "").toLowerCase();

  if (type === "BANK" || activity === "tài chính ngân hàng" || activity.includes("tài chính ngân hàng")) {
    return "Banks";
  }
  if (sector === "Chăm sóc sức khỏe") return "Healthcare";
  if (sector === "Năng lượng") return "Energy";
  if (sector === "Công nghệ") {
    if (activity.includes("viễn thông") || slug.includes("vien-thong")) return "Telecom";
    return "Technology";
  }
  if (sector === "Nguyên vật liệu") return "Materials";
  if (sector === "Hàng hóa thiết yếu") return "Consumer Staples";
  if (sector === "Hàng hóa không thiết yếu") return "Consumer Discretionary";
  if (sector === "Bất động sản") return "Real Estate";
  if (sector === "Tiện ích") return "Utilities";
  if (sector === "Tài chính") return "Financials";
  if (sector === "Công nghiệp") {
    if (
      activity.includes("vận chuyển") ||
      activity.includes("giao nhận") ||
      slug.includes("van-chuyen") ||
      slug.includes("giao-nhan")
    ) {
      return "Logistics";
    }
    return "Industrials";
  }
  return UNCLASSIFIED_SECTOR;
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
      mappedSector: mapSimplizeSector(d),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fundamentals overlay for the curated set. Behaviour matches main:
 * the whole requested list is fetched and the result is cached for 30 minutes.
 * Callers must pass only the curated symbols.
 */
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

interface SectorEntry {
  sector: string;
  expires: number;
}

/** Per-symbol sector store. Long TTL. Independent of the 30-min fundamentals cache. */
const sectorStore = new Map<string, SectorEntry>();

/** Test-only. Clears the in-memory sector store. */
export function clearSimplizeSectorStore(): void {
  sectorStore.clear();
}

/**
 * Progressive sector fill for non-curated names.
 * Each call returns already-known sectors and fetches up to MAX_SECTOR_FETCH_PER_CALL
 * missing ones. Not gated by the 30-minute fundamentals cache. Store resets on restart.
 */
export async function fetchSimplizeSectors(symbols: string[]): Promise<Map<string, string>> {
  const now = Date.now();
  const result = new Map<string, string>();
  const missing: string[] = [];
  for (const sym of symbols) {
    const hit = sectorStore.get(sym);
    if (hit && hit.expires > now) result.set(sym, hit.sector);
    else missing.push(sym);
  }
  const toFetch = missing.slice(0, MAX_SECTOR_FETCH_PER_CALL);
  if (toFetch.length) {
    await mapPool(toFetch, 10, async (sym) => {
      const snap = await fetchSimplizeSummary(sym);
      const sector = snap?.mappedSector ?? UNCLASSIFIED_SECTOR;
      sectorStore.set(sym, { sector, expires: now + SECTOR_TTL_MS });
      result.set(sym, sector);
    });
  }
  return result;
}
