import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, LayoutGrid, LineChart, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { DataStatus } from "./data-status";
import { TickerStrip } from "./ticker-strip";
import { useI18n } from "@/lib/i18n/provider";
import type { DataAttribution, IndexSnapshot, ScreenerRow } from "@/lib/market/types";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  attribution,
  degraded,
  indices = [],
  tickerRows = [],
}: {
  children: React.ReactNode;
  attribution: DataAttribution;
  degraded?: boolean;
  indices?: IndexSnapshot[];
  tickerRows?: ScreenerRow[];
}) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nav = [
    { to: "/", label: t("nav.market"), icon: LayoutGrid },
    { to: "/screener", label: t("nav.screener"), icon: BarChart3 },
    { to: "/market", label: t("nav.overview"), icon: LineChart },
    { to: "/methodology", label: t("nav.methodology"), icon: BookOpen },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-surface-2 focus:px-3 focus:py-2"
      >
        {t("nav.skip")}
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="flex h-12 items-center gap-3 px-3 lg:px-4">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border lg:hidden"
            aria-label={open ? t("a11y.menuClose") : t("a11y.menuOpen")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <Link to="/" className="flex items-center gap-2 pr-2">
            <span className="grid size-7 place-items-center rounded-md bg-accent text-[10px] font-semibold tracking-widest text-accent-fg">
              VN
            </span>
            <span className="text-sm font-semibold tracking-tight">VNStock</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t("a11y.primary")}>
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors duration-150 hover:text-fg",
                    active && "bg-surface-3 text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form
            className="ml-auto hidden min-w-0 max-w-xs flex-1 md:block"
            action="/screener"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = `/screener?q=${encodeURIComponent(query)}`;
            }}
          >
            <label className="relative block">
              <span className="sr-only">{t("nav.search")}</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="h-8 w-full rounded-md border border-border bg-surface-2 pl-8 pr-3 text-sm"
              />
            </label>
          </form>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="hidden border-t border-border px-4 py-1.5 lg:block">
          <DataStatus attribution={attribution} degraded={degraded} />
        </div>
        <TickerStrip indices={indices} rows={tickerRows} />
      </header>

      {open ? (
        <div className="fixed inset-0 z-30 bg-canvas/80 lg:hidden" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-72 border-r border-border bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-xs uppercase tracking-widest text-fg-subtle">{t("nav.navigate")}</p>
            <nav className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-3"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4">
              <DataStatus attribution={attribution} degraded={degraded} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-[calc(3rem+2.5rem)] hidden h-[calc(100vh-6rem)] w-[228px] shrink-0 border-r border-border p-4 lg:block">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-fg-subtle">{t("nav.workspace")}</p>
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg",
                    active && "bg-surface-2 text-fg",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-8 text-[11px] leading-relaxed text-fg-subtle">{t("nav.disclaimer")}</p>
        </aside>
        <main id="main" className="min-w-0 flex-1 overflow-x-clip px-3 py-5 sm:px-5 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
