"use client";

import { useSyncExternalStore } from "react";

import {
  readAnalyticsConsent,
  readServerAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "../utils/analyticsConsentStore";

export const useAnalyticsConsent = () =>
  useSyncExternalStore(
    subscribeToAnalyticsConsent,
    readAnalyticsConsent,
    readServerAnalyticsConsent,
  );
