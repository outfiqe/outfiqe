"use client";

import type { AnalyticsEventName, AnalyticsEventProperties } from "@outfiqe/utils";
import { useEffect, useRef } from "react";

import { trackEvent } from "../utils/analyticsClient";

export const useTrackView = <EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties: AnalyticsEventProperties[EventName],
  viewKey: string | null,
): void => {
  const trackedViewKey = useRef<string | null>(null);

  useEffect(() => {
    if (viewKey === null || trackedViewKey.current === viewKey) return;
    trackedViewKey.current = viewKey;
    trackEvent(eventName, properties);
  }, [eventName, properties, viewKey]);
};
