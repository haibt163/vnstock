export const THEME_KEY = "vnstock-theme";

export type ThemeChoice = "system" | "light" | "dark";

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  if (choice === "light" || choice === "dark") return choice;
  return prefersDark ? "dark" : "light";
}

export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
