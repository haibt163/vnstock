import { EXCHANGES, SECTORS } from "@/lib/market/universe";
import { PRESETS } from "@/lib/market/filters";
import type { Exchange, ScreenerFilters } from "@/lib/market/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

export function ScreenerToolbar({
  value,
  onChange,
  onReset,
}: {
  value: ScreenerFilters;
  onChange: (next: ScreenerFilters) => void;
  onReset: () => void;
}) {
  const { t, sectorLabel } = useI18n();
  return (
    <div className="max-w-full space-y-3">
      <div className="flex max-w-full flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant="outline"
            className="h-11 px-3"
            onClick={() => onChange({ ...p.filters, query: value.query })}
          >
            {t(`preset.${p.id}` as MessageKey)}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="h-11 px-3" onClick={onReset}>
          {t("screener.reset")}
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <Input
          value={value.query ?? ""}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder={t("screener.search")}
          aria-label={t("screener.search")}
          className="h-11"
        />
        <select
          className="h-11 rounded-md border border-border bg-surface-2 px-3 text-sm"
          value={value.exchanges?.[0] ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              exchanges: e.target.value ? [e.target.value as Exchange] : undefined,
            })
          }
          aria-label={t("a11y.exchange")}
        >
          <option value="">{t("screener.allExchanges")}</option>
          {EXCHANGES.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-md border border-border bg-surface-2 px-3 text-sm"
          value={value.sectors?.[0] ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              sectors: e.target.value ? [e.target.value] : undefined,
            })
          }
          aria-label={t("a11y.sector")}
        >
          <option value="">{t("screener.allSectors")}</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {sectorLabel(s)}
            </option>
          ))}
        </select>
        <Input
          type="number"
          inputMode="decimal"
          placeholder={t("screener.minChange")}
          aria-label={t("a11y.minChange")}
          value={value.minChangePct ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              minChangePct: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      </div>
    </div>
  );
}
