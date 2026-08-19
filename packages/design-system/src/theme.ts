"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "outfiqe-theme";

const DARK_CLASS = "dark";

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

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
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

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme };
};

export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("${DARK_CLASS}",d);}catch(e){}})();`;
