import type { Locale } from "@/lib/i18n/locale";

const ICT = "Asia/Ho_Chi_Minh";

export type FormatLocale = Locale;

/** Turnover / market cap cells are in tỷ VND (VND billion). */
export const VND_BILLION = 1_000_000_000;

const viInt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const viDec = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});
const viDec2 = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const viPriceSmall = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const enInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const enDec = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});
const enDec2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const enPriceSmall = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Unit-in-header convention:
 *   price     VND          59.200
 *   volume    shares (CP)  637.840 · 1.540.000
 *   money     tỷ VND / bn  37,76 · 499.670
 *   ratios    x            11,9 · 1,99
 *   percent   %            +0,34%
 * Cells never repeat triệu/tỷ/CP/đồng. English uses grouping, not mixed M/T suffixes.
 */
function groupedInt(value: number, locale: FormatLocale): string {
  return (locale === "en" ? enInt : viInt).format(Math.round(value));
}

export const EM_DASH = "—";

export function formatPrice(value: number | null | undefined, locale: FormatLocale = "vi"): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  if (Math.abs(value) >= 1000) return groupedInt(value, locale);
  return (locale === "en" ? enPriceSmall : viPriceSmall).format(value);
}

export function formatSigned(
  value: number | null | undefined,
  digits = 2,
  locale: FormatLocale = "vi",
): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: "exceptZero",
  }).format(value);
}

export function formatPct(value: number | null | undefined, locale: FormatLocale = "vi"): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  return `${formatSigned(value, 2, locale)}%`;
}

/** Share count. Header carries “CP” / “shares”. */
export function formatVolume(value: number | null | undefined, locale: FormatLocale = "vi"): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  return groupedInt(value, locale);
}

/** VND billion (tỷ). Header carries “tỷ VND” / “VND bn”. */
export function formatTurnover(value: number | null | undefined, locale: FormatLocale = "vi"): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  const bn = value / VND_BILLION;
  const abs = Math.abs(bn);
  if (abs >= 100) return groupedInt(bn, locale);
  if (abs >= 1) return (locale === "en" ? enDec : viDec).format(bn);
  return (locale === "en" ? enDec2 : viDec2).format(bn);
}

export function formatMarketCap(value: number | null | undefined, locale: FormatLocale = "vi"): string {
  return formatTurnover(value, locale);
}

export function formatRatio(
  value: number | null | undefined,
  digits = 1,
  locale: FormatLocale = "vi",
): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatIndex(value: number | null | undefined, locale: FormatLocale = "vi"): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function signedClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "text-fg-muted";
  return value > 0 ? "text-gain" : "text-loss";
}

export function signedBg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "bg-surface-2";
  return value > 0 ? "bg-gain-soft" : "bg-loss-soft";
}

export function formatIct(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return EM_DASH;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ICT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("hour")}:${g("minute")}:${g("second")} ICT`;
}

export function formatIctDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return EM_DASH;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ICT,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export function nowIctIso(date = new Date()): string {
  return date.toISOString();
}

export function ictParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ICT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: g("weekday"),
    year: Number(g("year")),
    month: Number(g("month")),
    day: Number(g("day")),
    hour: Number(g("hour")),
    minute: Number(g("minute")),
    second: Number(g("second")),
  };
}

export function formatIctClock(date = new Date()): string {
  const p = ictParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}
