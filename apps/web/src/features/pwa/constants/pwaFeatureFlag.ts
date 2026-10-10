import { isPwaKillSwitchEngagedOnClient } from "../service-worker/constants/pwaKillSwitch";

const ENABLED_FLAG_VALUE = "true";

export const isPwaEnabled =
  process.env.NEXT_PUBLIC_PWA_ENABLED === ENABLED_FLAG_VALUE && !isPwaKillSwitchEngagedOnClient();
