import type { BadgeDesignConfig, BadgeRarity } from "@outfiqe/types";
import { Lock } from "lucide-react";
import type { CSSProperties } from "react";

import {
  ANIMATION_CLASS,
  LOCKED_SIZE_CLASS,
  RARITY_DEFAULT_ANIMATION,
  RARITY_RING,
  SHAPE_CLIP_PATH,
  SHIMMER_OVERLAY_STYLE,
} from "./achievement-badge-icon.constants";
import { cn } from "./cn";
import { StudioBadgeVisual } from "./studio-badge-visual";

type AchievementBadgeIconProps = {
  icon: string;
  designConfig: BadgeDesignConfig;
  rarity: BadgeRarity;
  isLocked: boolean;
  className?: string;
};

const ShimmerSweep = () => (
  <span
    aria-hidden
    className="animate-badge-shimmer pointer-events-none absolute inset-0"
    style={SHIMMER_OVERLAY_STYLE}
  />
);

export const AchievementBadgeIcon = ({
  icon,
  designConfig,
  rarity,
  isLocked,
  className,
}: AchievementBadgeIconProps) => {
  const resolvedAnimation = isLocked
    ? "none"
    : (designConfig.animation ?? RARITY_DEFAULT_ANIMATION[rarity]);
  const animationClass = ANIMATION_CLASS[resolvedAnimation];
  const isShimmering = resolvedAnimation === "shimmer";

  const isStudio = "layers" in designConfig;
  const glowColor = isStudio
    ? designConfig.layers.find((layer) => layer.type === "background")?.fill
    : designConfig.primaryColor;
  const clipPath = isStudio ? undefined : SHAPE_CLIP_PATH[designConfig.shape];
  const hasImage = !isStudio && Boolean(designConfig.imageUrl) && !isLocked;

  return (
    <div
      aria-hidden
      className={cn(
        LOCKED_SIZE_CLASS,
        "relative flex shrink-0 items-center justify-center",
        isLocked ? "rounded-full bg-muted grayscale" : RARITY_RING[rarity],
        !isLocked && !clipPath && "rounded-full",
        !isLocked && animationClass,
        className,
      )}
      style={
        isLocked
          ? undefined
          : ({
              "--badge-glow-color": glowColor,
              "--tw-ring-color": isStudio ? undefined : designConfig.primaryColor,
            } as CSSProperties)
      }
    >
      {isLocked ? (
        <Lock className="size-5 text-muted-foreground" />
      ) : isStudio ? (
        <StudioBadgeVisual layers={designConfig.layers} isShimmering={isShimmering} />
      ) : (
        <div
          className={cn(
            "relative flex size-full items-center justify-center overflow-hidden text-2xl",
            !clipPath && "rounded-full",
          )}
          style={{ clipPath, backgroundColor: hasImage ? undefined : designConfig.primaryColor }}
        >
          {hasImage ? (
            <span
              className="size-full bg-cover bg-center"
              style={{ backgroundImage: `url(${designConfig.imageUrl})` }}
            />
          ) : (
            icon
          )}
          {isShimmering && <ShimmerSweep />}
        </div>
      )}
    </div>
  );
};
