import { Link } from "@tanstack/react-router";
import type { ScreenerRow } from "@/lib/market/types";
import { formatPrice, formatVolume } from "@/lib/market/format";
import { SignedChange } from "@/components/common/signed-value";
import { useI18n } from "@/lib/i18n/provider";

export function MoverTable({ title, rows }: { title: string; rows: ScreenerRow[] }) {
  const { t, companyName, locale } = useI18n();
  return (
    <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
      <h2 className="text-sm font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">{t("movers.empty")}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-fg-subtle">
            <tr>
              <th className="pb-2 font-medium">{t("movers.symbol")}</th>
              <th className="pb-2 text-right font-medium">{t("movers.price")}</th>
              <th className="pb-2 text-right font-medium">{t("movers.change")}</th>
              <th className="hidden pb-2 text-right font-medium sm:table-cell">{t("movers.volume")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.symbol} className="border-t border-border">
                <td className="py-2">
                  <Link to="/stock/$symbol" params={{ symbol: row.symbol }} className="font-medium hover:text-accent">
                    {row.symbol}
                  </Link>
                  <p className="max-w-[10rem] truncate text-xs text-fg-subtle">{companyName(row)}</p>
                </td>
                <td className="py-2 text-right font-mono tabular">{formatPrice(row.price, locale)}</td>
                <td className="py-2 text-right">
                  <SignedChange pct={row.changePct} />
                </td>
                <td className="hidden py-2 text-right font-mono text-fg-muted sm:table-cell">
                  {formatVolume(row.volume, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
