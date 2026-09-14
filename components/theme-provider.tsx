"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

const KEY = "kawaku-theme";

function apply(t: Theme) {
  const dark =
    t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return dark ? ("dark" as const) : ("light" as const);
}

const Ctx = createContext<{
  theme: Theme | undefined;
  resolvedTheme: "light" | "dark" | undefined;
  setTheme: (t: Theme) => void;
}>({ theme: undefined, resolvedTheme: undefined, setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme | undefined>(undefined);
  const [resolved, setResolved] = useState<"light" | "dark" | undefined>(undefined);

  useEffect(() => {
    setThemeState((localStorage.getItem(KEY) as Theme | null) ?? "system");
  }, []);

  useEffect(() => {
    if (!theme) return;
    setResolved(apply(theme));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") setResolved(apply("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* abaikan */
    }
    setThemeState(t);
  }, []);

  return <Ctx.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
