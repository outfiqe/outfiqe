"use client";

import { useEffect } from "react";

import { isPwaKillSwitchEngagedOnClient } from "../constants/pwaKillSwitch";
import { teardownServiceWorkerAndCaches } from "../utils/teardownServiceWorkerAndCaches";

export const PwaKillSwitchTeardown = () => {
  useEffect(() => {
    if (!isPwaKillSwitchEngagedOnClient()) return;
    void teardownServiceWorkerAndCaches();
  }, []);

  return null;
};
