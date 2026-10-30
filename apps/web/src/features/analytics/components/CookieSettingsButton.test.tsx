import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ANALYTICS_CONSENT_STATUS } from "../constants/analytics.constants";
import { updateAnalyticsConsent } from "../utils/analyticsConsentStore";
import { CookieSettingsButton } from "./CookieSettingsButton";

const openCookieSettings = vi.fn();

vi.mock("../utils/analyticsClient", () => ({
  openCookieSettings: () => openCookieSettings(),
}));

afterEach(() => {
  act(() => updateAnalyticsConsent({ consentStatus: ANALYTICS_CONSENT_STATUS.UNAVAILABLE }));
  vi.clearAllMocks();
});

describe("CookieSettingsButton", () => {
  it("isn't shown when analytics is off", () => {
    render(<CookieSettingsButton />);

    expect(screen.queryByRole("button", { name: "Cookie settings" })).not.toBeInTheDocument();
  });

  it("reopens the cookie choices", async () => {
    act(() => updateAnalyticsConsent({ consentStatus: ANALYTICS_CONSENT_STATUS.GRANTED }));
    const user = userEvent.setup();
    render(<CookieSettingsButton />);

    await user.click(screen.getByRole("button", { name: "Cookie settings" }));

    expect(openCookieSettings).toHaveBeenCalledTimes(1);
  });
});
