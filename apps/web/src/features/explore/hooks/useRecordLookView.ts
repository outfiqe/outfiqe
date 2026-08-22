"use client";

import { useEffect, useRef } from "react";

import { exploreFeedApi } from "../api/exploreFeedApi";

const VISIBILITY_THRESHOLD = 0.5;

export const useRecordLookView = (lookId: string, enabled: boolean) => {
  const cardRef = useRef<HTMLElement | null>(null);
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (hasRecordedRef.current) return;
        if (!entries[0]?.isIntersecting) return;

        hasRecordedRef.current = true;
        observer.disconnect();
        void exploreFeedApi.recordView(lookId);
      },
      { threshold: VISIBILITY_THRESHOLD },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [lookId, enabled]);

  return cardRef;
};
