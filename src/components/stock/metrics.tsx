import type { DataMode, FieldOrigin, Fundamentals, Quote } from "@/lib/market/types";
import { fieldOrigin, type MetricId } from "@/lib/market/field-origin";
import { EM_DASH, formatPct, formatPrice, formatRatio, formatTurnover, formatVolume } from "@/lib/market/format";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

function originKey(origin: FieldOrigin, demo: boolean): MessageKey {
  if (demo && origin !== "unavailable") return "stock.origin.demo";
  if (origin === "quoted") return "stock.origin.quoted";
  if (origin === "derived") return "stock.origin.derived";
  if (origin === "source") return "stock.origin.source";
  return "stock.origin.unavailable";
}

function Item({
  label,
  value,
  hint,
  originLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  originLabel: string;
}) {
  return (
    <div className="rounded-md bg-surface px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className="font-mono text-sm tabular">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">{originLabel}</p>
      {hint ? <p className="text-[11px] text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

export function MetricGrid({
  quote,
  fundamentals,
  mode = "live",
}: {
  quote: Quote;
  fundamentals: Fundamentals;
  mode?: DataMode;
}) {
  const { t, locale } = useI18n();
  const demo = mode === "demo";
  const item = (id: MetricId, label: MessageKey, value: string, raw: unknown, hint?: MessageKey) => {
    const origin = fieldOrigin(id, raw, mode);
    return (
      <Item
        key={id}
        label={t(label)}
        value={raw == null ? EM_DASH : value}
        hint={raw == null ? t("stock.hint.missing") : hint ? t(hint) : undefined}
        originLabel={t(originKey(origin, demo))}
      />
    );
  };

  return (
    <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
      <h2 className="text-sm font-medium">{t("stock.stats")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {item("open", "stock.open", formatPrice(quote.open, locale), quote.open)}
        {item("high", "stock.high", formatPrice(quote.high, locale), quote.high)}
        {item("low", "stock.low", formatPrice(quote.low, locale), quote.low)}
        {item("reference", "stock.reference", formatPrice(quote.reference, locale), quote.reference)}
        {item("volume", "stock.volume", formatVolume(quote.volume, locale), quote.volume)}
        {item("turnover", "stock.turnover", formatTurnover(quote.turnover, locale), quote.turnover)}
        {item("ceiling", "stock.ceiling", formatPrice(quote.ceiling, locale), quote.ceiling)}
        {item("floor", "stock.floor", formatPrice(quote.floor, locale), quote.floor)}
        {item(
          "marketCap",
          "stock.mcap",
          formatTurnover(fundamentals.marketCap, locale),
          fundamentals.marketCap,
          "stock.hint.derivedValuation",
        )}
        {item("pe", "stock.pe", formatRatio(fundamentals.pe, 1, locale), fundamentals.pe, "stock.hint.derivedValuation")}
        {item("pb", "stock.pb", formatRatio(fundamentals.pb, 2, locale), fundamentals.pb, "stock.hint.derivedValuation")}
        {item(
          "roe",
          "stock.roe",
          fundamentals.roe == null ? EM_DASH : formatPct(fundamentals.roe, locale),
          fundamentals.roe,
          "stock.hint.eod",
        )}
        {item(
          "dividendYield",
          "stock.div",
          fundamentals.dividendYield == null ? EM_DASH : formatPct(fundamentals.dividendYield, locale),
          fundamentals.dividendYield,
          "stock.hint.eod",
        )}
        {item("eps", "stock.eps", formatPrice(fundamentals.eps, locale), fundamentals.eps, "stock.hint.eod")}
        {item("bookValue", "stock.book", formatPrice(fundamentals.bookValue, locale), fundamentals.bookValue, "stock.hint.eod")}
        {item(
          "sharesOutstanding",
          "stock.shares",
          formatVolume(fundamentals.sharesOutstanding, locale),
          fundamentals.sharesOutstanding,
          "stock.hint.eod",
        )}
        {item(
          "revenueGrowth",
          "stock.revGrowth",
          fundamentals.revenueGrowth == null ? EM_DASH : formatPct(fundamentals.revenueGrowth, locale),
          fundamentals.revenueGrowth,
          "stock.hint.eod",
        )}
        {item(
          "profitGrowth",
          "stock.profitGrowth",
          fundamentals.profitGrowth == null ? EM_DASH : formatPct(fundamentals.profitGrowth, locale),
          fundamentals.profitGrowth,
          "stock.hint.eod",
        )}
        {item("high52w", "stock.high52", formatPrice(fundamentals.high52w, locale), fundamentals.high52w, "stock.hint.series")}
        {item("low52w", "stock.low52", formatPrice(fundamentals.low52w, locale), fundamentals.low52w, "stock.hint.series")}
      </div>
    </section>
  );
}
