import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { IndexCard } from "@/components/market/index-card";
import { BreadthChip, BreadthPanel } from "@/components/market/breadth";
import { MoverTable } from "@/components/market/movers";
import { SectorGrid } from "@/components/market/sector-grid";
import { getDashboard } from "@/lib/market/server";
import { useKeepLive } from "@/lib/market/use-live";
import { formatTurnover, formatVolume } from "@/lib/market/format";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/")({
  loader: () => getDashboard(),
  staleTime: 15_000,
  component: DashboardPage,
  head: () => ({ meta: [{ title: "VNStock · Thị trường" }] }),
});

function DashboardPage() {
  const initial = Route.useLoaderData();
  const data = useKeepLive(initial, () => getDashboard());
  const movers = [...data.gainers, ...data.losers, ...data.active];
  const { t, locale } = useI18n();
  const universeLabel = data.degraded
    ? t("dash.universeDemo", { n: data.universeSize })
    : t("dash.universeLive", { n: data.universeSize });

  return (
    <AppShell
      attribution={data.attribution}
      degraded={data.degraded}
      indices={data.indices}
      tickerRows={movers}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">{t("dash.kicker")}</p>
          <h1 className="text-2xl font-medium tracking-tight">{t("dash.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">{t("dash.lead", { label: universeLabel })}</p>
        </div>
        <Button asChild>
          <Link to="/screener">{t("dash.openScreener")}</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.indices.map((idx) => (
          <IndexCard key={idx.code} index={idx} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <BreadthChip label={t("dash.advancing")} value={data.breadth.advances} tone="gain" />
        <BreadthChip label={t("dash.unchanged")} value={data.breadth.unchanged} tone="muted" />
        <BreadthChip label={t("dash.declining")} value={data.breadth.declines} tone="loss" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{t("dash.volume")}</p>
          <p className="font-mono text-xl tabular">{formatVolume(data.volume, locale)}</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{t("dash.turnover")}</p>
          <p className="font-mono text-xl tabular">{formatTurnover(data.turnover, locale)}</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{t("dash.universe")}</p>
          <p className="font-mono text-xl tabular">{data.universeSize}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <MoverTable title={t("dash.gainers")} rows={data.gainers} />
        <MoverTable title={t("dash.losers")} rows={data.losers} />
        <MoverTable title={t("dash.active")} rows={data.active} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <BreadthPanel overview={data} />
        <SectorGrid sectors={data.sectors} />
      </div>
    </AppShell>
  );
}
