import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_CONSENT_STATUS,
  type AnalyticsConsentStatus,
} from "../constants/analytics.constants";
import { COOKIE_POLICY_PATH } from "../constants/cookieConsent.constants";
import { updateAnalyticsConsent } from "../utils/analyticsConsentStore";
import { CookieConsentBanner } from "./CookieConsentBanner";

const acceptAnalytics = vi.fn();
const rejectAnalytics = vi.fn();

vi.mock("../utils/analyticsClient", () => ({
  acceptAnalytics: () => acceptAnalytics(),
  rejectAnalytics: () => rejectAnalytics(),
}));

const setConsent = (consentStatus: AnalyticsConsentStatus, isSettingsOpen = false) =>
  act(() => updateAnalyticsConsent({ consentStatus, isSettingsOpen }));

afterEach(() => {
  setConsent(ANALYTICS_CONSENT_STATUS.UNAVAILABLE);
  vi.clearAllMocks();
});

describe("CookieConsentBanner", () => {
  it("asks a visitor who hasn't chosen yet", () => {
    setConsent(ANALYTICS_CONSENT_STATUS.PENDING);

    render(<CookieConsentBanner />);

    expect(screen.getByRole("region", { name: "Cookies on Outfiqe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cookie policy" })).toHaveAttribute(
      "href",
      COOKIE_POLICY_PATH,
    );
  });

  it("stays hidden once a choice is made, or when analytics is off", () => {
    setConsent(ANALYTICS_CONSENT_STATUS.GRANTED);
    const { rerender } = render(<CookieConsentBanner />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    setConsent(ANALYTICS_CONSENT_STATUS.UNAVAILABLE, true);
    rerender(<CookieConsentBanner />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("comes back when cookie settings are reopened", () => {
    setConsent(ANALYTICS_CONSENT_STATUS.DENIED, true);

    render(<CookieConsentBanner />);

    expect(screen.getByRole("region", { name: "Cookies on Outfiqe" })).toBeInTheDocument();
  });

  it("records the visitor's choice from each button, by keyboard too", async () => {
    setConsent(ANALYTICS_CONSENT_STATUS.PENDING);
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(screen.getByRole("button", { name: "Accept all" }));
    expect(acceptAnalytics).toHaveBeenCalledTimes(1);

    screen.getByRole("button", { name: "Essential only" }).focus();
    await user.keyboard("{Enter}");
    expect(rejectAnalytics).toHaveBeenCalledTimes(1);
  });
});
