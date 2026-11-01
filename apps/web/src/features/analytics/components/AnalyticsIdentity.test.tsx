import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANALYTICS_CONSENT_STATUS } from "../constants/analytics.constants";
import { updateAnalyticsConsent } from "../utils/analyticsConsentStore";
import { AnalyticsIdentity } from "./AnalyticsIdentity";

const identifyViewer = vi.fn();
const resetViewer = vi.fn();

vi.mock("../utils/analyticsClient", () => ({
  identifyViewer: (...identity: unknown[]) => identifyViewer(...identity),
  resetViewer: () => resetViewer(),
}));

type SignedInUser = { id: string; role: string };

type AuthFixture = {
  state: { user: SignedInUser | null };
  isAuthenticated: boolean;
  isAuthResolved: boolean;
  isStaff: boolean;
  isRider: boolean;
  isCreator: boolean;
  isBrandOwner: boolean;
};

const auth: AuthFixture = {
  state: { user: { id: "user-1", role: "CUSTOMER" } },
  isAuthenticated: true,
  isAuthResolved: true,
  isStaff: false,
  isRider: false,
  isCreator: true,
  isBrandOwner: false,
};

vi.mock("@/features/auth", () => ({ useAuth: () => auth }));

const signOut = () => {
  auth.state = { user: null };
  auth.isAuthenticated = false;
};

beforeEach(() => {
  auth.state = { user: { id: "user-1", role: "CUSTOMER" } };
  auth.isAuthenticated = true;
  auth.isAuthResolved = true;
  auth.isStaff = false;
  auth.isRider = false;
  act(() => updateAnalyticsConsent({ consentStatus: ANALYTICS_CONSENT_STATUS.GRANTED }));
});

afterEach(() => {
  act(() => updateAnalyticsConsent({ consentStatus: ANALYTICS_CONSENT_STATUS.UNAVAILABLE }));
  vi.clearAllMocks();
});

describe("AnalyticsIdentity", () => {
  it("identifies a signed-in visitor who accepted analytics, without personal details", () => {
    render(<AnalyticsIdentity />);

    expect(identifyViewer).toHaveBeenCalledWith("user-1", {
      user_role: "customer",
      is_creator: true,
      is_brand_owner: false,
      is_internal: false,
    });
  });

  it("marks staff and riders as internal so dashboards can leave them out", () => {
    auth.isRider = true;

    render(<AnalyticsIdentity />);

    expect(identifyViewer).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ is_internal: true }),
    );
  });

  it("waits for consent before identifying", () => {
    act(() => updateAnalyticsConsent({ consentStatus: ANALYTICS_CONSENT_STATUS.PENDING }));
    const { rerender } = render(<AnalyticsIdentity />);
    expect(identifyViewer).not.toHaveBeenCalled();

    act(() => updateAnalyticsConsent({ consentStatus: ANALYTICS_CONSENT_STATUS.GRANTED }));
    rerender(<AnalyticsIdentity />);
    expect(identifyViewer).toHaveBeenCalledTimes(1);
  });

  it("forgets the visitor after sign-out", () => {
    const { rerender } = render(<AnalyticsIdentity />);
    expect(resetViewer).not.toHaveBeenCalled();

    signOut();
    rerender(<AnalyticsIdentity />);

    expect(resetViewer).toHaveBeenCalledTimes(1);
  });

  it("clears an identity left from an earlier visit when the page loads signed out", () => {
    signOut();

    render(<AnalyticsIdentity />);

    expect(resetViewer).toHaveBeenCalledTimes(1);
    expect(identifyViewer).not.toHaveBeenCalled();
  });

  it("does nothing until the session check has finished", () => {
    auth.isAuthResolved = false;

    render(<AnalyticsIdentity />);

    expect(identifyViewer).not.toHaveBeenCalled();
    expect(resetViewer).not.toHaveBeenCalled();
  });
});
