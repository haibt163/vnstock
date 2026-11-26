/**
 * Simplize public company snapshot.
 * EOD/snapshot ratios (P/E, P/B, ROE, shares, growth). Not an official
 * exchange fundamental feed; usage rights for third-party apps are unclear.
 * Used only as a labelled overlay on top of live quotes — never as a LIVE badge.
 *
 * Sector fields (bcEconomicSectorName, bcIndustryGroupType, industryActivity, …)
 * are present in live responses (see docs/DATA_PROVIDERS.md probe). Mapped
 * only to existing app sector names; unmapped stay unavailable.
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
const TTL = 30 * 60_000;

/** Max new Simplize requests per overlay call to stay inside the 6 s wait and avoid storms. */
const MAX_NEW_PER_CALL = 40;

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

/** Accumulating in-memory store so repeated overlay calls do not re-request known symbols. */
const simplizeStore = new Map<string, SimplizeSnapshot>();

export async function fetchSimplizeSummaries(symbols: string[]): Promise<Map<string, SimplizeSnapshot>> {
  return cached("simplize:summaries", TTL, async () => {
    const map = new Map<string, SimplizeSnapshot>();
    const missing: string[] = [];
    for (const sym of symbols) {
      const hit = simplizeStore.get(sym);
      if (hit) map.set(sym, hit);
      else missing.push(sym);
    }
    // Bound new work to avoid request storms and stay inside overlay timeout.
    const toFetch = missing.slice(0, MAX_NEW_PER_CALL);
    if (toFetch.length) {
      await mapPool(toFetch, 10, async (sym) => {
        const snap = await fetchSimplizeSummary(sym);
        if (snap) {
          simplizeStore.set(sym, snap);
          map.set(sym, snap);
        }
      });
    }
    return map;
  });
}