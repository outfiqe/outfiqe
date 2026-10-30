"use client";

import { ANALYTICS_CONSENT_STATUS } from "../constants/analytics.constants";
import { COOKIE_SETTINGS_LABEL } from "../constants/cookieConsent.constants";
import { useAnalyticsConsent } from "../hooks/useAnalyticsConsent";
import { openCookieSettings } from "../utils/analyticsClient";

export const CookieSettingsButton = () => {
  const { consentStatus } = useAnalyticsConsent();
  if (consentStatus === ANALYTICS_CONSENT_STATUS.UNAVAILABLE) return null;

  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      {COOKIE_SETTINGS_LABEL}
    </button>
  );
};
