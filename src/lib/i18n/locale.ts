export const LOCALE_KEY = "vnstock-locale";

export type Locale = "vi" | "en";

export const DEFAULT_LOCALE: Locale = "vi";

export function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}

export function resolveLocale(stored: string | null | undefined): Locale {
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

/** Default is Vietnamese even if the browser is English. */
export const LOCALE_BOOTSTRAP = `(function(){try{var l=localStorage.getItem('${LOCALE_KEY}')||'${DEFAULT_LOCALE}';if(l!=='en'&&l!=='vi')l='${DEFAULT_LOCALE}';var r=document.documentElement;r.lang=l;r.dataset.locale=l;}catch(e){document.documentElement.lang='${DEFAULT_LOCALE}';}})();`;
