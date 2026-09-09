"use client";

import { useEffect, useSyncExternalStore } from "react";

import { DARK_CLASS, THEME_STORAGE_KEY } from "./theme-init";

export type Theme = "light" | "dark";

type ThemeListener = () => void;

const listeners = new Set<ThemeListener>();

const prefersDarkColorScheme = (): boolean =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const readStoredTheme = (): Theme | null => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
};

const resolveCurrentTheme = (): Theme => {
  if (document.documentElement.classList.contains(DARK_CLASS)) return "dark";
  return readStoredTheme() ?? (prefersDarkColorScheme() ? "dark" : "light");
};

const getServerTheme = (): Theme => "light";

const applyThemeClass = (theme: Theme) => {
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
};

const applyTheme = (theme: Theme) => {
  applyThemeClass(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

const subscribeToTheme = (listener: ThemeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const setTheme = (theme: Theme) => {
  applyTheme(theme);
  for (const listener of listeners) listener();
};

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribeToTheme, resolveCurrentTheme, getServerTheme);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme };
};
