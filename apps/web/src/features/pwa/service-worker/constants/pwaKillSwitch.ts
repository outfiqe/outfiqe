export const PWA_KILL_SWITCH_ATTRIBUTE = "data-pwa-killed";

export const isPwaKillSwitchEngagedOnClient = (): boolean =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute(PWA_KILL_SWITCH_ATTRIBUTE) === "true";
