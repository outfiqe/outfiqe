"use client";

import { Compass } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/shared/lib/cn";

import { TOUR_REPLAY_LABEL } from "../constants/tourReplay";
import { useTourLaunch } from "../context/TourLaunchContext";

const TourReplayPendingDot = () => {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-1 size-1.5 shrink-0 rounded-full bg-current transition-opacity duration-150",
        pending ? "opacity-70 motion-safe:animate-pulse" : "opacity-0",
      )}
    />
  );
};

export type TourReplayLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href: string;
  iconClassName?: string;
  showLabel?: boolean;
};

export const TourReplayLink = forwardRef<HTMLAnchorElement, TourReplayLinkProps>(
  ({ href, iconClassName, showLabel = true, className, onNavigate, ...props }, ref) => {
    const { startTourLoading } = useTourLaunch();

    return (
      <Link
        ref={ref}
        href={href}
        className={className}
        onNavigate={(event) => {
          startTourLoading(href);
          onNavigate?.(event);
        }}
        {...props}
      >
        <Compass aria-hidden="true" className={iconClassName} />
        {showLabel ? TOUR_REPLAY_LABEL : <span className="sr-only">{TOUR_REPLAY_LABEL}</span>}
        <TourReplayPendingDot />
      </Link>
    );
  },
);
TourReplayLink.displayName = "TourReplayLink";
