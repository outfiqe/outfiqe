"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

import { isPwaEnabled } from "../constants/pwaFeatureFlag";
import {
  SERVICE_WORKER_SCOPE,
  SERVICE_WORKER_SCRIPT_TYPE,
  SERVICE_WORKER_URL,
} from "../constants/serviceWorker";

export const ServiceWorkerProvider = ({ children }: { children: ReactNode }) => (
  <SerwistProvider
    swUrl={SERVICE_WORKER_URL}
    disable={!isPwaEnabled}
    reloadOnOnline={false}
    options={{ scope: SERVICE_WORKER_SCOPE, type: SERVICE_WORKER_SCRIPT_TYPE }}
  >
    {children}
  </SerwistProvider>
);
