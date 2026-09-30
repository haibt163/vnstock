/**
 * VPS symbol master. Discovery only — not a quote source.
 *
 * getlistckindex/{hose|hnx|upcom} is a JSON array of tickers on that board.
 * getlistallstock carries names; type "S" is an equity. Names are optional.
 * Cached for 6 hours. Quote polling uses a separate, shorter cache.
 */
import { cached } from "./cache.ts";
import {
  buildSecurityUniverse,
  UNIVERSE,
  type ListedName,
} from "./universe.ts";
import type { Exchange, SecurityIdentity } from "./types.ts";

const LIST_URL = "https://bgapidatafeed.vps.com.vn/getlistckindex";
const NAMES_URL = "https://bgapidatafeed.vps.com.vn/getlistallstock";
const TIMEOUT_MS = 25_000;
/** Listings change slowly. Do not refetch on every screener poll. */
export const UNIVERSE_TTL_MS = 6 * 60 * 60 * 1000;

const HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "User-Agent": "VNStock/1.0",
};

export interface SecurityUniverse {
  identities: SecurityIdentity[];
  counts: Record<Exchange, number>;
  scope: "vps-board" | "curated-fallback";
  vn30Source: "vps" | "curated";
}

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
      throw new Error("timeout");
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

function asTickerList(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) {
    throw new Error(`invalid_universe_${label}`);
  }
  return raw;
}

function parseNames(raw: unknown): Map<string, ListedName> {
  const map = new Map<string, ListedName>();
  if (!Array.isArray(raw)) return map;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const symbol = typeof rec.stock_code === "string" ? rec.stock_code.trim().toUpperCase() : "";
    if (!symbol) continue;
    const nameVi = typeof rec.name_vn === "string" ? rec.name_vn.trim() : "";
    const nameEn = typeof rec.name_en === "string" ? rec.name_en.trim() : "";
    const type = typeof rec.type === "string" ? rec.type.trim().toUpperCase() : "";
    map.set(symbol, { name: nameEn || nameVi, nameVi: nameVi || nameEn, type });
  }
  return map;
}

async function fetchBoardList(board: string): Promise<string[]> {
  const raw = await fetchJson(`${LIST_URL}/${board}`);
  return asTickerList(raw, board);
}

function curatedFallback(): SecurityUniverse {
  const counts: Record<Exchange, number> = { HOSE: 0, HNX: 0, UPCoM: 0 };
  for (const row of UNIVERSE) counts[row.exchange] += 1;
  return {
    identities: UNIVERSE,
    counts,
    scope: "curated-fallback",
    vn30Source: "curated",
  };
}

async function fetchVpsUniverse(): Promise<SecurityUniverse> {
  const [hose, hnx, upcom, vn30Result, namesResult] = await Promise.all([
    fetchBoardList("hose"),
    fetchBoardList("hnx"),
    fetchBoardList("upcom"),
    fetchBoardList("vn30").catch(() => null),
    fetchJson(NAMES_URL).catch(() => null),
  ]);
  if (hose.length === 0 || hnx.length === 0 || upcom.length === 0) {
    throw new Error("vps_universe_empty");
  }
  if (hose.length + hnx.length + upcom.length <= UNIVERSE.length) {
    throw new Error("vps_universe_thin");
  }
  const names = namesResult ? parseNames(namesResult) : null;
  const vn30FromFeed = vn30Result != null && vn30Result.length > 0;
  const built = buildSecurityUniverse({
    hose,
    hnx,
    upcom,
    vn30: vn30Result ?? [],
    names,
    vn30FromFeed,
  });
  if (built.identities.length <= UNIVERSE.length) throw new Error("vps_universe_thin");
  if (built.counts.HOSE === 0 || built.counts.HNX === 0 || built.counts.UPCoM === 0) {
    throw new Error("vps_universe_missing_exchange");
  }
  console.info(
    "[vnstock] universe",
    built.counts.HOSE,
    built.counts.HNX,
    built.counts.UPCoM,
    "names",
    names?.size ?? 0,
    "vn30",
    vn30FromFeed ? "vps" : "curated",
  );
  return {
    identities: built.identities,
    counts: built.counts,
    scope: "vps-board",
    vn30Source: vn30FromFeed ? "vps" : "curated",
  };
}

export async function loadSecurityUniverse(): Promise<SecurityUniverse> {
  try {
    return await cached("universe:vps", UNIVERSE_TTL_MS, fetchVpsUniverse);
  } catch (err) {
    console.warn(
      "[vnstock] VPS universe discovery failed, using curated 69",
      err instanceof Error ? err.message : "error",
    );
    return curatedFallback();
  }
}
