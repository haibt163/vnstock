import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenerTable } from "@/components/screener/screener-table";
import { ScreenerToolbar } from "@/components/screener/screener-toolbar";
import { applyScreenerFilters } from "@/lib/market/filters";
import { getScreenerRows } from "@/lib/market/server";
import { useKeepLive } from "@/lib/market/use-live";
import { useI18n } from "@/lib/i18n/provider";
import type { Exchange, ScreenerFilters } from "@/lib/market/types";

type Search = {
  q?: string;
  ex?: string;
  s?: string;
  vn30?: boolean;
  minChg?: number;
  maxChg?: number;
};

export const Route = createFileRoute("/screener")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    q: typeof raw.q === "string" ? raw.q : undefined,
    ex: typeof raw.ex === "string" ? raw.ex : undefined,
    s: typeof raw.s === "string" ? raw.s : undefined,
    vn30: raw.vn30 === true || raw.vn30 === "true" || raw.vn30 === "1" ? true : undefined,
    minChg: typeof raw.minChg === "number" ? raw.minChg : typeof raw.minChg === "string" ? Number(raw.minChg) : undefined,
    maxChg: typeof raw.maxChg === "number" ? raw.maxChg : typeof raw.maxChg === "string" ? Number(raw.maxChg) : undefined,
  }),
  loader: () => getScreenerRows(),
  staleTime: 15_000,
  component: ScreenerPage,
  head: () => ({ meta: [{ title: "VNStock · Bộ lọc" }] }),
});

function searchToFilters(search: Search): ScreenerFilters {
  return {
    query: search.q,
    exchanges: search.ex ? [search.ex as Exchange] : undefined,
    sectors: search.s ? [search.s] : undefined,
    vn30Only: search.vn30 || undefined,
    minChangePct: Number.isFinite(search.minChg) ? search.minChg : undefined,
    maxChangePct: Number.isFinite(search.maxChg) ? search.maxChg : undefined,
  };
}

function ScreenerPage() {
  const initial = Route.useLoaderData();
  const payload = useKeepLive(initial, () => getScreenerRows());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/screener" });
  const filters = searchToFilters(search);
  const rows = applyScreenerFilters(payload.rows, filters);
  const { t } = useI18n();

  const setFilters = (next: ScreenerFilters) => {
    void navigate({
      search: {
        q: next.query || undefined,
        ex: next.exchanges?.[0],
        s: next.sectors?.[0],
        vn30: next.vn30Only || undefined,
        minChg: next.minChangePct,
        maxChg: next.maxChangePct,
      },
    });
  };

  return (
    <AppShell
      attribution={payload.attribution}
      degraded={payload.degraded}
      tickerRows={payload.rows}
    >
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">{t("screener.kicker")}</p>
        <h1 className="text-2xl font-medium tracking-tight">{t("screener.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">{t("screener.lead")}</p>
      </div>
      <ScreenerToolbar
        value={filters}
        onChange={setFilters}
        onReset={() => void navigate({ search: {} })}
      />
      <div className="mt-4">
        <ScreenerTable rows={rows} />
      </div>
    </AppShell>
  );
}
