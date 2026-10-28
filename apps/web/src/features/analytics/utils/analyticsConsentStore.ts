import {
  ANALYTICS_CONSENT_STATUS,
  type AnalyticsConsentStatus,
} from "../constants/analytics.constants";

export type AnalyticsConsentSnapshot = {
  consentStatus: AnalyticsConsentStatus;
  isSettingsOpen: boolean;
};

const UNAVAILABLE_SNAPSHOT: AnalyticsConsentSnapshot = {
  consentStatus: ANALYTICS_CONSENT_STATUS.UNAVAILABLE,
  isSettingsOpen: false,
};

let currentSnapshot = UNAVAILABLE_SNAPSHOT;

const consentListeners = new Set<() => void>();

export const subscribeToAnalyticsConsent = (listener: () => void): (() => void) => {
  consentListeners.add(listener);
  return () => consentListeners.delete(listener);
};

export const readAnalyticsConsent = (): AnalyticsConsentSnapshot => currentSnapshot;

export const readServerAnalyticsConsent = (): AnalyticsConsentSnapshot => UNAVAILABLE_SNAPSHOT;

export const updateAnalyticsConsent = (change: Partial<AnalyticsConsentSnapshot>): void => {
  currentSnapshot = { ...currentSnapshot, ...change };
  consentListeners.forEach((listener) => listener());
};
