export const ANALYTICS_RELAY_PATH = "/a7x";

export const POSTHOG_UI_HOST = "https://us.posthog.com";

export const POSTHOG_CONFIG_DEFAULTS = "2026-08-30";

export const ANALYTICS_APP_NAME = "web";

export const ANALYTICS_CONSENT_STATUS = {
  GRANTED: "granted",
  DENIED: "denied",
  PENDING: "pending",
  UNAVAILABLE: "unavailable",
} as const;

export type AnalyticsConsentStatus =
  (typeof ANALYTICS_CONSENT_STATUS)[keyof typeof ANALYTICS_CONSENT_STATUS];

export const POSTHOG_USER_STATE_PROPERTY = "$user_state";

export const POSTHOG_IDENTIFIED_USER_STATE = "identified";

export const REDACTED_VALUE = "[redacted]";

export const PRIVATE_ANALYTICS_CLASS_NAME = "ph-no-capture";

export const EVERY_ELEMENT_SELECTOR = "*";
