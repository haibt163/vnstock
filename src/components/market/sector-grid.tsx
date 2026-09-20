import type { SectorSnapshot } from "@/lib/market/types";
import { formatPct, signedClass } from "@/lib/market/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function SectorGrid({ sectors }: { sectors: SectorSnapshot[] }) {
  const { t, sectorLabel, locale } = useI18n();
  return (
    <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
      <h2 className="text-sm font-medium">{t("sectors.title")}</h2>
      <p className="mt-1 text-xs text-fg-subtle">{t("sectors.hint")}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {sectors.map((s) => (
          <li key={s.sector} className="flex items-center justify-between rounded-md bg-surface px-3 py-2">
            <div>
              <p className="text-sm">{sectorLabel(s.sector)}</p>
              <p className="text-[11px] text-fg-subtle">
                {t("sectors.meta", { count: s.count, up: s.advancers, down: s.decliners })}
              </p>
            </div>
            <span className={cn("font-mono text-sm tabular", signedClass(s.avgChangePct))}>
              {formatPct(s.avgChangePct, locale)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
