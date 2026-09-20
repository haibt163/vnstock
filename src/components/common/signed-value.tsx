import { formatPct, formatSigned, signedClass } from "@/lib/market/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export function SignedChange({
  value,
  pct,
  className,
}: {
  value?: number | null;
  pct?: number | null;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const n = pct ?? value ?? 0;
  const Icon = n > 0 ? TrendingUp : n < 0 ? TrendingDown : Minus;
  const word = n > 0 ? t("stock.dir.up") : n < 0 ? t("stock.dir.down") : t("stock.dir.unchanged");
  return (
    <span className={cn("inline-flex items-center gap-1 tabular", signedClass(n), className)}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{word}</span>
      {pct != null ? formatPct(pct, locale) : formatSigned(value, 2, locale)}
    </span>
  );
}
