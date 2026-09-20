import { Link } from "@tanstack/react-router";
import type { IndexSnapshot, ScreenerRow } from "@/lib/market/types";
import { formatIndex, formatPct, formatPrice, signedClass } from "@/lib/market/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function uniqueBySymbol(rows: ScreenerRow[]) {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.symbol)) return false;
    seen.add(r.symbol);
    return true;
  });
}

export function TickerStrip({
  indices,
  rows,
}: {
  indices: IndexSnapshot[];
  rows: ScreenerRow[];
}) {
  const uniqueRows = uniqueBySymbol(rows).slice(0, 24);
  const { locale } = useI18n();
  return (
    <div className="relative h-8 overflow-hidden border-b border-border bg-[var(--ticker)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--ticker)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--ticker)] to-transparent" />
      <div className="ticker-track absolute top-0 flex w-max gap-6 py-1.5 pr-6">
        {[0, 1].map((copy) => (
          <span key={`copy-${copy}`} className="flex gap-6">
            {indices.map((i) => (
              <Link
                key={`${copy}-idx-${i.code}`}
                to="/market"
                className="flex items-center gap-2 whitespace-nowrap text-[11px] tracking-wide"
              >
                <span className="font-medium text-fg-muted">{i.name}</span>
                <span className="tabular text-fg">{formatIndex(i.value, locale)}</span>
                <span className={cn("tabular", signedClass(i.changePct))}>{formatPct(i.changePct, locale)}</span>
              </Link>
            ))}
            {uniqueRows.map((r) => (
              <Link
                key={`${copy}-sym-${r.symbol}`}
                to="/stock/$symbol"
                params={{ symbol: r.symbol }}
                className="flex items-center gap-2 whitespace-nowrap text-[11px] tracking-wide"
              >
                <span className="font-medium text-fg-muted">{r.symbol}</span>
                <span className="tabular text-fg">{formatPrice(r.price, locale)}</span>
                <span className={cn("tabular", signedClass(r.changePct))}>{formatPct(r.changePct, locale)}</span>
              </Link>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
