import type { AnalyticsEventName, AnalyticsEventProperties } from "@outfiqe/utils";
import posthog from "posthog-js";

import { isRunningStandalone } from "@/features/pwa/utils/standalone";
import { APP_ENV, IS_PROD } from "@/shared/lib/appEnv";

import {
  ANALYTICS_APP_NAME,
  ANALYTICS_CONSENT_STATUS,
  ANALYTICS_RELAY_PATH,
  EVERY_ELEMENT_SELECTOR,
  POSTHOG_CONFIG_DEFAULTS,
  POSTHOG_UI_HOST,
} from "../constants/analytics.constants";
import { updateAnalyticsConsent } from "./analyticsConsentStore";
import { redactPersonalText, scrubPersonalData } from "./scrubPersonalData";

export type AnalyticsViewerProperties = {
  user_role: string;
  is_creator: boolean;
  is_brand_owner: boolean;
  is_internal: boolean;
};

let isAnalyticsStarted = false;

const hasGrantedConsent = (): boolean =>
  posthog.get_explicit_consent_status() === ANALYTICS_CONSENT_STATUS.GRANTED;

const publishConsentStatus = (): void => {
  updateAnalyticsConsent({
    consentStatus: posthog.get_explicit_consent_status(),
    isSettingsOpen: false,
  });
};

const startRecordingWhenConsented = (): void => {
  if (hasGrantedConsent()) posthog.startSessionRecording();
};

export const initAnalytics = (
  projectToken: string | undefined = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
): void => {
  if (isAnalyticsStarted || !IS_PROD || !projectToken) return;

  posthog.init(projectToken, {
    api_host: ANALYTICS_RELAY_PATH,
    ui_host: POSTHOG_UI_HOST,
    defaults: POSTHOG_CONFIG_DEFAULTS,
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    cookieless_mode: "on_reject",
    capture_exceptions: false,
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: EVERY_ELEMENT_SELECTOR,
      maskTextFn: redactPersonalText,
    },
    before_send: scrubPersonalData,
    loaded: startRecordingWhenConsented,
  });
  posthog.register({ app: ANALYTICS_APP_NAME, app_env: APP_ENV, is_pwa: isRunningStandalone() });

  isAnalyticsStarted = true;
  publishConsentStatus();
};

export const trackEvent = <EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties: AnalyticsEventProperties[EventName],
): void => {
  if (!isAnalyticsStarted) return;
  posthog.capture(eventName, properties);
};

export const identifyViewer = (userId: string, viewer: AnalyticsViewerProperties): void => {
  if (!isAnalyticsStarted || !hasGrantedConsent()) return;
  posthog.identify(userId, viewer);
};

export const resetViewer = (): void => {
  if (!isAnalyticsStarted) return;
  posthog.reset();
};

export const acceptAnalytics = (): void => {
  if (!isAnalyticsStarted) return;
  posthog.opt_in_capturing();
  posthog.startSessionRecording();
  publishConsentStatus();
};

export const rejectAnalytics = (): void => {
  if (!isAnalyticsStarted) return;
  posthog.opt_out_capturing();
  posthog.stopSessionRecording();
  posthog.reset();
  publishConsentStatus();
};

export const openCookieSettings = (): void => {
  if (!isAnalyticsStarted) return;
  updateAnalyticsConsent({ isSettingsOpen: true });
};
