import type { VisibilityState } from "@tanstack/react-table";

export const SCREENER_COLS_KEY = "vnstock-screener-cols";

/** Display order: critical fields first so a short pan still shows them. */
export const SCREENER_COLUMN_IDS = [
  "symbol",
  "name",
  "price",
  "changePct",
  "volume",
  "marketCap",
  "sector",
  "pe",
  "pb",
  "exchange",
  "turnover",
  "roe",
  "dividendYield",
] as const;

export type ScreenerColumnId = (typeof SCREENER_COLUMN_IDS)[number];

export const PINNED_COLUMN: ScreenerColumnId = "symbol";

/** Optional columns — off until the user turns them on. */
export const DEFAULT_HIDDEN_COLUMNS: readonly ScreenerColumnId[] = [
  "exchange",
  "turnover",
  "roe",
  "dividendYield",
];

export function defaultScreenerVisibility(): VisibilityState {
  const vis: VisibilityState = { [PINNED_COLUMN]: true };
  for (const id of DEFAULT_HIDDEN_COLUMNS) vis[id] = false;
  return vis;
}

export function parseScreenerVisibility(raw: string | null | undefined): VisibilityState {
  const base = defaultScreenerVisibility();
  if (!raw) return base;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return base;
    const rec = parsed as Record<string, unknown>;
    for (const id of SCREENER_COLUMN_IDS) {
      if (id === PINNED_COLUMN) {
        base[id] = true;
        continue;
      }
      if (typeof rec[id] === "boolean") base[id] = rec[id];
    }
    return base;
  } catch {
    return base;
  }
}

export function serializeScreenerVisibility(state: VisibilityState): string {
  const out: Record<string, boolean> = {};
  for (const id of SCREENER_COLUMN_IDS) {
    out[id] = id === PINNED_COLUMN ? true : state[id] !== false;
  }
  return JSON.stringify(out);
}
