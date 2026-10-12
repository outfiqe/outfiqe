import "server-only";

const KILL_SWITCH_ACTIVE_VALUE = "true";

export const isPwaKillSwitchEngagedOnServer = (): boolean =>
  process.env.PWA_KILL_SWITCH === KILL_SWITCH_ACTIVE_VALUE;
