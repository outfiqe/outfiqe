import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const environment = vi.hoisted(() => ({ isProd: true }));

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  get_explicit_consent_status: vi.fn(() => "pending"),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

vi.mock("@/shared/lib/appEnv", () => ({
  APP_ENV: "prod",
  get IS_PROD() {
    return environment.isProd;
  },
}));

vi.mock("@/features/pwa/utils/standalone", () => ({ isRunningStandalone: () => false }));

const PROJECT_TOKEN = "phc_test_token";

const readInitCall = () => {
  const [firstInitCall] = posthogMock.init.mock.calls;
  if (!firstInitCall) throw new Error("PostHog was never started");
  return firstInitCall;
};

const loadAnalytics = async () => {
  vi.resetModules();
  const analyticsClient = await import("./analyticsClient");
  const consentStore = await import("./analyticsConsentStore");
  return { ...analyticsClient, ...consentStore };
};

beforeEach(() => {
  environment.isProd = true;
  vi.clearAllMocks();
  posthogMock.get_explicit_consent_status.mockReturnValue("pending");
});

describe("initAnalytics", () => {
  it("starts PostHog through the relay with cookieless counting until consent", async () => {
    const { initAnalytics, readAnalyticsConsent } = await loadAnalytics();

    initAnalytics(PROJECT_TOKEN);

    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    const [token, config] = readInitCall();
    expect(token).toBe(PROJECT_TOKEN);
    expect(config).toMatchObject({
      api_host: "/a7x",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      cookieless_mode: "on_reject",
      capture_exceptions: false,
      disable_session_recording: true,
      session_recording: { maskAllInputs: true },
    });
    expect(posthogMock.register).toHaveBeenCalledWith({
      app: "web",
      app_env: "prod",
      is_pwa: false,
    });
    expect(readAnalyticsConsent()).toEqual({ consentStatus: "pending", isSettingsOpen: false });
  });

  it("starts only once", async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics(PROJECT_TOKEN);
    initAnalytics(PROJECT_TOKEN);

    expect(posthogMock.init).toHaveBeenCalledTimes(1);
  });

  it("sends nothing outside production", async () => {
    environment.isProd = false;
    const { initAnalytics, trackEvent } = await loadAnalytics();

    initAnalytics(PROJECT_TOKEN);
    trackEvent(ANALYTICS_EVENTS.PWA_INSTALL, {});

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("sends nothing without a project token", async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics(undefined);

    expect(posthogMock.init).not.toHaveBeenCalled();
  });

  it("starts recording on load only for a visitor who already accepted", async () => {
    const { initAnalytics } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);
    const [, { loaded }] = readInitCall();

    loaded();
    expect(posthogMock.startSessionRecording).not.toHaveBeenCalled();

    posthogMock.get_explicit_consent_status.mockReturnValue("granted");
    loaded();
    expect(posthogMock.startSessionRecording).toHaveBeenCalledTimes(1);
  });
});

describe("trackEvent", () => {
  it("captures a catalog event once analytics has started", async () => {
    const { initAnalytics, trackEvent } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    trackEvent(ANALYTICS_EVENTS.WISHLIST_ITEM_ADD, { product_id: "product-1" });

    expect(posthogMock.capture).toHaveBeenCalledWith("wishlist:item_add", {
      product_id: "product-1",
    });
  });
});

describe("identifyViewer and resetViewer", () => {
  const viewer = {
    user_role: "customer",
    is_creator: false,
    is_brand_owner: false,
    is_internal: false,
  };

  it("identifies a signed-in visitor only after they accepted analytics", async () => {
    const { initAnalytics, identifyViewer } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    identifyViewer("user-1", viewer);
    expect(posthogMock.identify).not.toHaveBeenCalled();

    posthogMock.get_explicit_consent_status.mockReturnValue("granted");
    identifyViewer("user-1", viewer);
    expect(posthogMock.identify).toHaveBeenCalledWith("user-1", viewer);
  });

  it("resets the identity on sign-out", async () => {
    const { initAnalytics, resetViewer } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    resetViewer();

    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
  });
});

describe("consent choices", () => {
  it("accepting opts in, starts recording and closes the banner", async () => {
    const { initAnalytics, acceptAnalytics, readAnalyticsConsent } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    posthogMock.get_explicit_consent_status.mockReturnValue("granted");
    acceptAnalytics();

    expect(posthogMock.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(posthogMock.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(readAnalyticsConsent()).toEqual({ consentStatus: "granted", isSettingsOpen: false });
  });

  it("choosing essential only opts out, stops recording and forgets the visitor", async () => {
    const { initAnalytics, rejectAnalytics, readAnalyticsConsent } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    posthogMock.get_explicit_consent_status.mockReturnValue("denied");
    rejectAnalytics();

    expect(posthogMock.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(posthogMock.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
    expect(readAnalyticsConsent()).toEqual({ consentStatus: "denied", isSettingsOpen: false });
  });

  it("reopens the banner from cookie settings", async () => {
    const { initAnalytics, openCookieSettings, readAnalyticsConsent } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    openCookieSettings();

    expect(readAnalyticsConsent().isSettingsOpen).toBe(true);
  });

  it("ignores consent actions when analytics never started", async () => {
    environment.isProd = false;
    const {
      initAnalytics,
      acceptAnalytics,
      rejectAnalytics,
      openCookieSettings,
      readAnalyticsConsent,
    } = await loadAnalytics();
    initAnalytics(PROJECT_TOKEN);

    acceptAnalytics();
    rejectAnalytics();
    openCookieSettings();

    expect(posthogMock.opt_in_capturing).not.toHaveBeenCalled();
    expect(posthogMock.opt_out_capturing).not.toHaveBeenCalled();
    expect(readAnalyticsConsent()).toEqual({ consentStatus: "unavailable", isSettingsOpen: false });
  });
});
