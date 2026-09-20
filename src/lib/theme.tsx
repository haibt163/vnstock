import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEME_KEY, resolveTheme, type ThemeChoice } from "./theme-script";

export type { ThemeChoice };

function apply(choice: ThemeChoice) {
  const prefersDark =
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
  const mode = resolveTheme(choice, prefersDark);
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode === "light");
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
}

const ThemeContext = createContext<{
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (c: ThemeChoice) => void;
}>({ choice: "system", resolved: "dark", setChoice: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [mode, setMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemeChoice | null) ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setChoiceState(stored);
    setMode(resolveTheme(stored, prefersDark));
    apply(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(THEME_KEY) as ThemeChoice | null) ?? "system";
      if (current === "system") {
        setMode(resolveTheme("system", mq.matches));
        apply("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setChoice = (c: ThemeChoice) => {
    localStorage.setItem(THEME_KEY, c);
    setChoiceState(c);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setMode(resolveTheme(c, prefersDark));
    apply(c);
  };

  const value = useMemo(() => ({ choice, resolved: mode, setChoice }), [choice, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useTheme() {
  return useContext(ThemeContext);
}
