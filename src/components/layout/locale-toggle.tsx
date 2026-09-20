import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Locale; short: string }[] = [
  { id: "vi", short: "VI" },
  { id: "en", short: "EN" },
];

export function LocaleToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t("locale.group")}
      className="inline-flex rounded-md border border-border bg-surface-2 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(opt.id === "vi" ? "locale.vi" : "locale.en")}
            onClick={() => setLocale(opt.id)}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-[11px] font-semibold tracking-wide text-fg-muted transition-colors duration-150",
              active && "bg-surface-3 text-fg",
            )}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
