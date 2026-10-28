import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorLinkType } from "#generated/prisma/enums.js";

import { sendToPosthog } from "./product-analytics.posthog.js";
import { productAnalyticsService } from "./product-analytics.service.js";
import { toStableEventUuid } from "./product-analytics.utils.js";

vi.mock("./product-analytics.posthog.js", () => ({
  sendToPosthog: vi.fn(),
  flushProductAnalytics: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("productAnalyticsService.captureServerEvent", () => {
  it("sends the event marked as coming from the API, with a fixed id from the bus event", () => {
    productAnalyticsService.captureServerEvent({
      distinctId: "user-1",
      event: ANALYTICS_EVENTS.EMAIL_VERIFY,
      properties: {},
      sourceEventId: "user.email.verified:1-0",
    });

    expect(sendToPosthog).toHaveBeenCalledWith({
      distinctId: "user-1",
      event: "account:email_verify",
      properties: { source: "api" },
      uuid: toStableEventUuid("user.email.verified:1-0"),
    });
  });

  it("skips the person profile when the event has no real person behind it", () => {
    productAnalyticsService.captureServerEvent({
      distinctId: "brand_application:app-1",
      event: ANALYTICS_EVENTS.BRAND_APPLICATION_SUBMIT,
      properties: { application_id: "app-1" },
      hasPersonProfile: false,
    });

    expect(sendToPosthog).toHaveBeenCalledWith({
      distinctId: "brand_application:app-1",
      event: "brand:application_submit",
      properties: { application_id: "app-1", source: "api", $process_person_profile: false },
    });
  });
});

describe("productAnalyticsService.captureCreatorLinkClick", () => {
  it("attributes a signed-in visitor's click to their account", () => {
    productAnalyticsService.captureCreatorLinkClick({
      visitorUserId: "user-7",
      visitorSessionId: "session-1",
      creatorId: "creator-1",
      productId: "product-1",
      linkType: CreatorLinkType.EXTERNAL_REUSABLE,
    });

    expect(sendToPosthog).toHaveBeenCalledWith({
      distinctId: "user-7",
      event: "creator_link:link_click",
      properties: {
        creator_id: "creator-1",
        product_id: "product-1",
        link_type: "external_reusable",
        source: "api",
      },
    });
  });

  it("counts an anonymous click against its session without creating a profile", () => {
    productAnalyticsService.captureCreatorLinkClick({
      visitorUserId: undefined,
      visitorSessionId: "session-1",
      creatorId: "creator-1",
      productId: null,
      linkType: CreatorLinkType.INTERNAL_SINGLE_USE,
    });

    expect(sendToPosthog).toHaveBeenCalledWith({
      distinctId: "link_session:session-1",
      event: "creator_link:link_click",
      properties: {
        creator_id: "creator-1",
        product_id: null,
        link_type: "internal_single_use",
        source: "api",
        $process_person_profile: false,
      },
    });
  });
});
