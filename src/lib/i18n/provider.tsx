import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_KEY, resolveLocale, type Locale } from "./locale";
import { companyName as formatCompany, sectorLabel as formatSector, translate, type MessageKey } from "./messages";

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;
type NameFn = (row: { name: string; nameVi: string }) => string;

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFn;
  companyName: NameFn;
  sectorLabel: (sector: string) => string;
}>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
  companyName: (row) => formatCompany(row, DEFAULT_LOCALE),
  sectorLabel: (sector) => formatSector(DEFAULT_LOCALE, sector),
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = resolveLocale(localStorage.getItem(LOCALE_KEY));
    setLocaleState(stored);
    document.documentElement.lang = stored;
    document.documentElement.dataset.locale = stored;
  }, []);

  const setLocale = (l: Locale) => {
    localStorage.setItem(LOCALE_KEY, l);
    setLocaleState(l);
    document.documentElement.lang = l;
    document.documentElement.dataset.locale = l;
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: ((key, vars) => translate(locale, key, vars)) as TFn,
      companyName: ((row: { name: string; nameVi: string }) => formatCompany(row, locale)) as NameFn,
      sectorLabel: (sector: string) => formatSector(locale, sector),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useI18n() {
  return useContext(LocaleContext);
}
