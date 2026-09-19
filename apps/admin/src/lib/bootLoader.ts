import { useEffect } from "react";

export const BOOT_LOADER_ID = "boot-loader";
export const BOOT_LOADER_HIDDEN_CLASS = "boot-loader-hidden";
export const BOOT_LOADER_FADE_MS = 150;
export const BOOT_LOADER_MAX_VISIBLE_MS = 15_000;

export const hideBootLoader = () => {
  const bootLoader = document.getElementById(BOOT_LOADER_ID);
  if (!bootLoader) return;

  bootLoader.classList.add(BOOT_LOADER_HIDDEN_CLASS);
  window.setTimeout(() => bootLoader.remove(), BOOT_LOADER_FADE_MS);
};

export const useHideBootLoader = () => {
  useEffect(() => {
    hideBootLoader();
  }, []);
};
