"use client";

import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { ANALYTICS_CONSENT_STATUS } from "../constants/analytics.constants";
import {
  COOKIE_CONSENT_ACCEPT_LABEL,
  COOKIE_CONSENT_ESSENTIAL_LABEL,
  COOKIE_CONSENT_MESSAGE,
  COOKIE_CONSENT_TITLE,
  COOKIE_POLICY_LABEL,
  COOKIE_POLICY_PATH,
} from "../constants/cookieConsent.constants";
import { useAnalyticsConsent } from "../hooks/useAnalyticsConsent";
import { acceptAnalytics, rejectAnalytics } from "../utils/analyticsClient";

const COOKIE_CONSENT_TITLE_ID = "cookie-consent-title";

export const CookieConsentBanner = () => {
  const { consentStatus, isSettingsOpen } = useAnalyticsConsent();

  const isChoicePending = consentStatus === ANALYTICS_CONSENT_STATUS.PENDING;
  const isAnalyticsAvailable = consentStatus !== ANALYTICS_CONSENT_STATUS.UNAVAILABLE;
  if (!isAnalyticsAvailable || (!isChoicePending && !isSettingsOpen)) return null;

  return (
    <section
      aria-labelledby={COOKIE_CONSENT_TITLE_ID}
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-xl rounded-xl border border-border bg-card p-4 shadow-lg lg:bottom-6"
    >
      <h2 id={COOKIE_CONSENT_TITLE_ID} className="text-sm font-semibold text-foreground">
        {COOKIE_CONSENT_TITLE}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{COOKIE_CONSENT_MESSAGE}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" className="cursor-pointer" onClick={acceptAnalytics}>
          {COOKIE_CONSENT_ACCEPT_LABEL}
        </Button>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={rejectAnalytics}>
          {COOKIE_CONSENT_ESSENTIAL_LABEL}
        </Button>
        <Link
          href={COOKIE_POLICY_PATH}
          prefetch={false}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {COOKIE_POLICY_LABEL}
        </Link>
      </div>
    </section>
  );
};
