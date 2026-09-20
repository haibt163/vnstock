import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemeChoice; icon: typeof Sun; labelKey: "theme.system" | "theme.light" | "theme.dark" }[] = [
  { id: "system", icon: Monitor, labelKey: "theme.system" },
  { id: "light", icon: Sun, labelKey: "theme.light" },
  { id: "dark", icon: Moon, labelKey: "theme.dark" },
];

export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  const { t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t("theme.group")}
      className="inline-flex rounded-md border border-border bg-surface-2 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = choice === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(opt.labelKey)}
            onClick={() => setChoice(opt.id)}
            className={cn(
              "flex size-9 items-center justify-center rounded-sm text-fg-muted transition-colors duration-150",
              active && "bg-surface-3 text-fg",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
