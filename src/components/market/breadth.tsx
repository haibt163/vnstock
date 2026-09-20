import type { MarketOverview } from "@/lib/market/types";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function Bar({
  advances,
  declines,
  unchanged,
}: {
  advances: number;
  declines: number;
  unchanged: number;
}) {
  const total = Math.max(1, advances + declines + unchanged);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
      <span className="bg-gain" style={{ width: `${(advances / total) * 100}%` }} />
      <span className="bg-fg-subtle/50" style={{ width: `${(unchanged / total) * 100}%` }} />
      <span className="bg-loss" style={{ width: `${(declines / total) * 100}%` }} />
    </div>
  );
}

export function BreadthPanel({ overview }: { overview: MarketOverview }) {
  const { t } = useI18n();
  const board = overview.breadth;
  const uni = overview.universeBreadth;
  const items = [
    {
      key: "board",
      label: board.scope === "exchange" ? t("breadth.exchange") : t("breadth.universe", { n: overview.universeSize }),
      advances: board.advances,
      declines: board.declines,
      unchanged: board.unchanged,
    },
    {
      key: "universe",
      label: t("breadth.universe", { n: overview.universeSize }),
      advances: uni.advances,
      declines: uni.declines,
      unchanged: uni.unchanged,
    },
  ];
  return (
    <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
      <h2 className="text-sm font-medium">{t("breadth.title")}</h2>
      <div className="mt-3 space-y-4">
        {items.map((b) => (
          <div key={b.key}>
            <p className="text-xs text-fg-subtle">{b.label}</p>
            <Bar advances={b.advances} declines={b.declines} unchanged={b.unchanged} />
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-gain">{t("breadth.advancing")}</dt>
                <dd className="font-mono tabular">{b.advances}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">{t("breadth.unchanged")}</dt>
                <dd className="font-mono tabular">{b.unchanged}</dd>
              </div>
              <div>
                <dt className="text-loss">{t("breadth.declining")}</dt>
                <dd className="font-mono tabular">{b.declines}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BreadthChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gain" | "loss" | "muted";
}) {
  return (
    <div className={cn("rounded-lg bg-surface-2 px-3 py-2 shadow-[var(--elev-border)]")}>
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <p
        className={cn(
          "font-mono text-xl tabular",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
    </div>
  );
}
