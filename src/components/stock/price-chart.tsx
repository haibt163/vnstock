import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartRange, PricePoint } from "@/lib/market/types";
import { formatIctDate, formatPrice, formatVolume } from "@/lib/market/format";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const RANGES: ChartRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

export function PriceChart({
  series,
  range,
  onRange,
  positive,
}: {
  series: PricePoint[];
  range: ChartRange;
  onRange: (r: ChartRange) => void;
  positive: boolean;
}) {
  const { t, locale } = useI18n();
  const stroke = positive ? "var(--gain)" : "var(--loss)";
  const data = series.map((p) => ({
    ...p,
    label: formatIctDate(p.date),
  }));
  return (
    <section className="rounded-xl bg-surface-2 p-4 shadow-[var(--elev-border)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{t("stock.history")}</h2>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => onRange(r)}
              className={cn(range === r && "pointer-events-none")}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>
      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-fg-muted">{t("stock.noHistory")}</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="px" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} minTickGap={28} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
                tickFormatter={(v) => formatPrice(Number(v), locale)}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--fg)",
                }}
                formatter={(v, name) => {
                  if (name === "close") return [formatPrice(Number(v), locale), t("market.last")];
                  if (name === "volume") return [formatVolume(Number(v), locale), t("stock.volume")];
                  return [String(v), String(name)];
                }}
              />
              <Area type="monotone" dataKey="close" stroke={stroke} fill="url(#px)" strokeWidth={1.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
