import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { IndexCard } from "@/components/market/index-card";
import { BreadthPanel } from "@/components/market/breadth";
import { MoverTable } from "@/components/market/movers";
import { SectorGrid } from "@/components/market/sector-grid";
import { getDashboard } from "@/lib/market/server";
import { useKeepLive } from "@/lib/market/use-live";
import { formatIndex, formatTurnover, formatVolume } from "@/lib/market/format";
import { SignedChange } from "@/components/common/signed-value";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/market")({
  loader: () => getDashboard(),
  staleTime: 15_000,
  component: MarketPage,
  head: () => ({ meta: [{ title: "VNStock · Toàn cảnh" }] }),
});

function MarketPage() {
  const initial = Route.useLoaderData();
  const data = useKeepLive(initial, () => getDashboard());
  const { t, locale } = useI18n();

  return (
    <AppShell
      attribution={data.attribution}
      degraded={data.degraded}
      indices={data.indices}
      tickerRows={[...data.gainers, ...data.active]}
    >
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">{t("market.kicker")}</p>
        <h1 className="text-2xl font-medium tracking-tight">{t("market.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">{t("market.lead")}</p>
      </div>

      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-surface-2">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-fg-subtle">
            <tr className="border-b border-border">
              <th className="px-3 py-2 font-medium">{t("market.index")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("market.last")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("market.change")}</th>
              <th className="px-3 py-2 text-right font-medium" title={t("screener.colTitle.volume")}>
                {t("market.volume")}
              </th>
              <th className="px-3 py-2 text-right font-medium" title={t("screener.colTitle.turnover")}>
                {t("market.turnover")}
              </th>
              <th className="px-3 py-2 text-right font-medium">{t("market.aud")}</th>
            </tr>
          </thead>
          <tbody>
            {data.indices.map((idx) => (
              <tr key={idx.code} className="border-b border-border">
                <td className="px-3 py-2">
                  <p className="font-medium">{idx.name}</p>
                  <p className="text-xs text-fg-subtle">{idx.code}</p>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular">{formatIndex(idx.value, locale)}</td>
                <td className="px-3 py-2 text-right">
                  <SignedChange value={idx.change} pct={idx.changePct} />
                </td>
                <td className="px-3 py-2 text-right font-mono tabular text-fg-muted">
                  {formatVolume(idx.volume, locale)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular text-fg-muted">
                  {formatTurnover(idx.turnover, locale)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular text-fg-muted">
                  {idx.advances ?? "—"} / {idx.unchanged ?? "—"} / {idx.declines ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.indices.map((idx) => (
          <IndexCard key={idx.code} index={idx} />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <BreadthPanel overview={data} />
        <SectorGrid sectors={data.sectors} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <MoverTable title={t("market.gainers")} rows={data.gainers} />
        <MoverTable title={t("market.losers")} rows={data.losers} />
        <MoverTable title={t("market.active")} rows={data.active} />
      </div>
    </AppShell>
  );
}
