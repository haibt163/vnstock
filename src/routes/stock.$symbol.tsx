import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/stock/metrics";
import { PriceChart } from "@/components/stock/price-chart";
import { SignedChange } from "@/components/common/signed-value";
import { Badge } from "@/components/ui/badge";
import { getStockDetail } from "@/lib/market/server";
import { formatPrice, formatVolume, EM_DASH, formatRatio } from "@/lib/market/format";
import { deriveTechnicals } from "@/lib/market/technicals";
import { sliceHistory } from "@/lib/market/normalize";
import { useKeepLive } from "@/lib/market/use-live";
import { useI18n } from "@/lib/i18n/provider";
import type { ChartRange, SecurityDetail } from "@/lib/market/types";

type StockPayload = SecurityDetail & { degraded: boolean };

export const Route = createFileRoute("/stock/$symbol")({
  loader: async ({ params }) => {
    const detail = await getStockDetail({ data: { symbol: params.symbol } });
    if (!detail) throw notFound();
    return { ...detail, degraded: detail.attribution.mode !== "live" } satisfies StockPayload;
  },
  staleTime: 15_000,
  component: StockPage,
  head: ({ params }) => ({ meta: [{ title: `VNStock · ${params.symbol.toUpperCase()}` }] }),
});

function StockPage() {
  const initial = Route.useLoaderData();
  const detail = useKeepLive(initial, async () => {
    const next = await getStockDetail({ data: { symbol: initial.identity.symbol } });
    if (!next) throw new Error("not_found");
    return { ...next, degraded: next.attribution.mode !== "live" };
  });
  const [range, setRange] = useState<ChartRange>("6M");
  const series = useMemo(() => sliceHistory(detail.history, range), [detail.history, range]);
  const last = series.at(-1)?.close ?? detail.quote.price;
  const tech = deriveTechnicals(series);
  const positive = (detail.quote.changePct ?? 0) >= 0;
  const { t, locale, companyName, sectorLabel } = useI18n();
  const overview = locale === "vi" ? detail.overviewVi : detail.overview;

  return (
    <AppShell attribution={detail.attribution} degraded={detail.degraded} tickerRows={detail.peers}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-medium tracking-tight">{detail.identity.symbol}</h1>
            <Badge>{detail.identity.exchange}</Badge>
            <Badge>{sectorLabel(detail.identity.sector)}</Badge>
            {detail.identity.vn30 ? <Badge tone="accent">VN30</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {companyName(detail.identity)}
            <span className="text-fg-subtle">
              {" "}
              · {locale === "vi" ? detail.identity.name : detail.identity.nameVi}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl tabular tracking-tight">{formatPrice(detail.quote.price, locale)}</p>
          <SignedChange value={detail.quote.change} pct={detail.quote.changePct} className="justify-end text-sm" />
          <p className="mt-1 text-xs text-fg-muted">
            {t("stock.vol")} {formatVolume(detail.quote.volume, locale)}
          </p>
        </div>
      </div>

      {last != null && detail.quote.price != null && Math.abs(last - detail.quote.price) > 1 ? (
        <p className="mb-3 text-xs text-warn">{t("stock.alignWarn")}</p>
      ) : null}

      <PriceChart series={series} range={range} onRange={setRange} positive={positive} />

      <div className="mt-3">
        <MetricGrid quote={detail.quote} fundamentals={detail.fundamentals} mode={detail.attribution.mode} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
          <h2 className="text-sm font-medium">{t("stock.company")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{overview}</p>
        </section>
        <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
          <h2 className="text-sm font-medium">{t("stock.derived")}</h2>
          <p className="mt-1 text-xs text-fg-subtle">{t("stock.derivedHint")}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-fg-subtle">{t("stock.ma20")}</dt>
              <dd className="font-mono tabular">{formatPrice(tech.ma20, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{t("stock.ma50")}</dt>
              <dd className="font-mono tabular">{formatPrice(tech.ma50, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{t("stock.rsi")}</dt>
              <dd className="font-mono tabular">{formatRatio(tech.rsi14, 1, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{t("stock.macd")}</dt>
              <dd className="font-mono tabular">{tech.macd ? formatRatio(tech.macd.macd, 2, locale) : EM_DASH}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{t("stock.support")}</dt>
              <dd className="font-mono tabular">{formatPrice(tech.support, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{t("stock.resistance")}</dt>
              <dd className="font-mono tabular">{formatPrice(tech.resistance, locale)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {detail.peers.length ? (
        <section className="mt-3 rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
          <h2 className="text-sm font-medium">{t("stock.peers")}</h2>
          <ul className="mt-3 divide-y divide-border">
            {detail.peers.map((p) => (
              <li key={p.symbol} className="flex items-center justify-between py-2 text-sm">
                <Link to="/stock/$symbol" params={{ symbol: p.symbol }} className="font-medium hover:text-accent">
                  {p.symbol}
                  <span className="ml-2 font-normal text-fg-muted">{companyName(p)}</span>
                </Link>
                <span className="flex items-center gap-3">
                  <span className="font-mono tabular">{formatPrice(p.price, locale)}</span>
                  <SignedChange pct={p.changePct} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-xs text-fg-subtle">
        {t("stock.seriesClose", { series: formatPrice(tech.lastClose, locale), header: formatPrice(detail.quote.price, locale) })}
      </p>
    </AppShell>
  );
}
