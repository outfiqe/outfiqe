"use client";

import type { ReactNode } from "react";

import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";

import type { CreatorProfile } from "../api/creatorProfileSchemas";

type CreatorProfileAvatarProps = {
  avatarUrl: string | null;
  avatarImage: CreatorProfile["avatarImage"] | undefined;
  avatarFallback: ReactNode;
  showsAvatarRing: boolean;
  titleBadgeAccentColor: string | null;
};

export const CreatorProfileAvatar = ({
  avatarUrl,
  avatarImage,
  avatarFallback,
  showsAvatarRing,
  titleBadgeAccentColor,
}: CreatorProfileAvatarProps) => (
  <div className={cn("relative shrink-0", showsAvatarRing && "rounded-full p-1 sm:p-1.5")}>
    {showsAvatarRing && (
      <div
        aria-hidden
        className="absolute inset-0 rounded-full animate-avatar-ring-spin"
        style={{
          background: `conic-gradient(from 0deg, ${titleBadgeAccentColor}, transparent 40%, transparent 60%, ${titleBadgeAccentColor})`,
          boxShadow: `0 0 14px 2px ${titleBadgeAccentColor}66`,
        }}
      />
    )}
    <div className="relative size-16 overflow-hidden rounded-full sm:size-20">
      {avatarUrl ? (
        <AppImage
          src={avatarUrl}
          image={avatarImage}
          alt=""
          fill
          sizes="(min-width: 640px) 80px, 64px"
        />
      ) : (
        avatarFallback
      )}
    </div>
  </div>
);
