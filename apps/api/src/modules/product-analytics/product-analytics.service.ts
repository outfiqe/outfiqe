import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@outfiqe/utils";

import type { CreatorLinkType } from "#generated/prisma/enums.js";

import { productAnalyticsInsightsService } from "./insights/insights.service.js";
import {
  ANALYTICS_CREATOR_LINK_TYPE,
  ANALYTICS_EVENT_SOURCE,
  ANONYMOUS_DISTINCT_ID_PREFIX,
} from "./product-analytics.constants.js";
import { flushProductAnalytics, sendToPosthog } from "./product-analytics.posthog.js";
import type { ServerAnalyticsEvent } from "./product-analytics.types.js";
import { toStableEventUuid } from "./product-analytics.utils.js";

type CreatorLinkClick = {
  visitorUserId: string | undefined;
  visitorSessionId: string;
  creatorId: string;
  productId: string | null;
  linkType: CreatorLinkType;
};

const captureServerEvent = <EventName extends AnalyticsEventName>({
  distinctId,
  event,
  properties,
  sourceEventId,
  hasPersonProfile = true,
}: ServerAnalyticsEvent<EventName>): void => {
  sendToPosthog({
    distinctId,
    event,
    properties: {
      ...properties,
      source: ANALYTICS_EVENT_SOURCE,
      ...(hasPersonProfile ? {} : { $process_person_profile: false }),
    },
    ...(sourceEventId ? { uuid: toStableEventUuid(sourceEventId) } : {}),
  });
};

export const productAnalyticsService = {
  captureServerEvent,

  captureCreatorLinkClick({
    visitorUserId,
    visitorSessionId,
    creatorId,
    productId,
    linkType,
  }: CreatorLinkClick): void {
    captureServerEvent({
      distinctId:
        visitorUserId ?? `${ANONYMOUS_DISTINCT_ID_PREFIX.LINK_SESSION}:${visitorSessionId}`,
      event: ANALYTICS_EVENTS.CREATOR_LINK_CLICK,
      properties: {
        creator_id: creatorId,
        product_id: productId,
        link_type: ANALYTICS_CREATOR_LINK_TYPE[linkType],
      },
      hasPersonProfile: visitorUserId !== undefined,
    });
  },

  flushPendingEvents: flushProductAnalytics,

  ...productAnalyticsInsightsService,
};
