"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const IDLE_PREFETCH_START_DELAY_MS = 200;

const IDLE_PREFETCH_STAGGER_MS = 150;

const isPrefetchableHref = (href: string): boolean =>
  !href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("/admin");

const scheduleIdleWork = (runWhenIdle: () => void, delayMs: number): void => {
  setTimeout(() => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(runWhenIdle);
    } else {
      runWhenIdle();
    }
  }, delayMs);
};

export const useIdlePrefetchSidebarLinks = (hrefs: readonly string[]): void => {
  const router = useRouter();
  const hrefsKey = hrefs.join(",");

  useEffect(() => {
    const prefetchableHrefs = hrefsKey ? hrefsKey.split(",").filter(isPrefetchableHref) : [];

    prefetchableHrefs.forEach((href, index) => {
      scheduleIdleWork(
        () => router.prefetch(href),
        IDLE_PREFETCH_START_DELAY_MS + index * IDLE_PREFETCH_STAGGER_MS,
      );
    });
  }, [hrefsKey, router]);
};
