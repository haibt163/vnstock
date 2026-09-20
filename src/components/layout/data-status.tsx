import { Badge } from "@/components/ui/badge";
import type { DataAttribution, SessionPhase } from "@/lib/market/types";
import { fallbackReasonTag } from "@/lib/market/fallback-reason";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/messages";

function sessionKey(phase: SessionPhase): MessageKey {
  return `session.${phase}` as MessageKey;
}

const REASON_KEYS = {
  timeout: "status.reason.timeout",
  rate_limited: "status.reason.rate_limited",
  http: "status.reason.http",
  invalid_schema: "status.reason.invalid_schema",
  no_usable_quote: "status.reason.no_usable_quote",
  unknown: "status.reason.unknown",
} as const satisfies Record<string, MessageKey>;

function reasonKey(raw?: string | null): MessageKey {
  const tag = fallbackReasonTag(raw);
  return REASON_KEYS[tag as keyof typeof REASON_KEYS] ?? REASON_KEYS.unknown;
}

export function DataStatus({
  attribution,
  degraded,
  className,
}: {
  attribution: DataAttribution;
  degraded?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const docs = attribution.sourceLabel === "Documentation";
  const delayed = attribution.freshness === "DELAYED" && attribution.mode === "live" && !degraded && !docs;
  const live = attribution.mode === "live" && !degraded && !docs && !delayed;
  const tone = docs ? "default" : delayed ? "warn" : live ? (attribution.freshness === "MARKET_CLOSED" ? "default" : "live") : "demo";
  const label = docs
    ? t("status.reference")
    : attribution.mode === "demo" || degraded
      ? t("status.demo")
      : delayed
        ? t("status.delayed")
        : attribution.freshness === "MARKET_CLOSED"
          ? t("status.closed")
          : t("status.live");
  const quoteReason = delayed ? attribution.fallbackReason : undefined;
  const historyYahoo = attribution.historySourceId === "yahoo";
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs text-fg-muted", className)}>
      <Badge tone={tone} aria-label={`Data mode ${label}`}>
        <span
          className={cn(
            "size-1.5 rounded-full",
            live && attribution.freshness === "LIVE"
              ? "bg-gain"
              : delayed
                ? "bg-warn"
                : live
                  ? "bg-fg-subtle"
                  : docs
                    ? "bg-accent"
                    : "bg-warn",
          )}
          aria-hidden
        />
        {label}
      </Badge>
      <span>
        {t("status.source")}: {attribution.sourceLabel}
      </span>
      {quoteReason ? (
        <>
          <span aria-hidden>·</span>
          <span title={quoteReason}>
            {t("status.quoteFallback")}: {t(reasonKey(quoteReason))}
          </span>
        </>
      ) : null}
      {historyYahoo ? (
        <>
          <span aria-hidden>·</span>
          <span title={attribution.historyFallbackReason ?? t("status.historyDelayed")}>
            {t("status.historyDelayed")}
            {attribution.historyFallbackReason ? `: ${t(reasonKey(attribution.historyFallbackReason))}` : null}
          </span>
        </>
      ) : null}
      {docs ? null : (
        <>
          <span aria-hidden>·</span>
          <span>
            {t("status.updated")} {attribution.asOfIct}
          </span>
          <span aria-hidden>·</span>
          <span>{t(sessionKey(attribution.session))}</span>
          {attribution.fundamentalsAsOf ? (
            <>
              <span aria-hidden>·</span>
              <span>EOD {attribution.fundamentalsAsOf}</span>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
