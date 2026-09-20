import type { IndexSnapshot } from "@/lib/market/types";
import { formatIndex, formatTurnover, formatVolume, signedBg } from "@/lib/market/format";
import { SignedChange } from "@/components/common/signed-value";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function IndexCard({ index }: { index: IndexSnapshot }) {
  const { t, locale } = useI18n();
  return (
    <article className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">{index.name}</p>
      <p className="mt-1 font-mono text-2xl font-medium tabular tracking-tight">{formatIndex(index.value, locale)}</p>
      <div className={cn("mt-2 inline-flex rounded-sm px-1.5 py-0.5", signedBg(index.changePct))}>
        <SignedChange value={index.change} pct={index.changePct} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-fg-muted">
        <div>
          <dt className="text-fg-subtle">{t("market.volume")}</dt>
          <dd className="tabular">{formatVolume(index.volume, locale)}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">{t("market.turnover")}</dt>
          <dd className="tabular">{formatTurnover(index.turnover, locale)}</dd>
        </div>
      </dl>
    </article>
  );
}
