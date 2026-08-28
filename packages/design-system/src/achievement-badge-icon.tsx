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

  if ("layers" in designConfig) {
    const backgroundLayer = designConfig.layers.find((layer) => layer.type === "background");
    return (
      <div
        aria-hidden
        className={cn(
          LOCKED_SIZE_CLASS,
          "relative shrink-0",
          isLocked ? "bg-muted grayscale" : RARITY_RING[rarity],
          animationClass,
          className,
        )}
        style={
          !isLocked && backgroundLayer
            ? ({ "--badge-glow-color": backgroundLayer.fill } as CSSProperties)
            : undefined
        }
      >
        {isLocked ? (
          <div className="flex size-full items-center justify-center">
            <Lock className="size-5 text-muted-foreground" />
          </div>
        ) : (
          <StudioBadgeVisual layers={designConfig.layers} isShimmering={isShimmering} />
        )}
      </div>
    );
  }

  const clipPath = SHAPE_CLIP_PATH[designConfig.shape];
  const hasImage = Boolean(designConfig.imageUrl) && !isLocked;

  return (
    <div
      aria-hidden
      className={cn(
        LOCKED_SIZE_CLASS,
        "flex shrink-0 items-center justify-center overflow-hidden text-2xl",
        isLocked ? "bg-muted grayscale" : RARITY_RING[rarity],
        !clipPath && "rounded-full",
        animationClass,
        className,
      )}
      style={{
        clipPath,
        backgroundColor: isLocked || hasImage ? undefined : designConfig.primaryColor,
        ...(isShimmering ? SHIMMER_OVERLAY_STYLE : undefined),
        ...(!isLocked && ({ "--tw-ring-color": designConfig.primaryColor } as CSSProperties)),
        ...(!isLocked && ({ "--badge-glow-color": designConfig.primaryColor } as CSSProperties)),
      }}
    >
      {isLocked ? (
        <Lock className="size-5 text-muted-foreground" />
      ) : hasImage ? (
        <span
          className="size-full bg-cover bg-center"
          style={{ backgroundImage: `url(${designConfig.imageUrl})` }}
        />
      ) : (
        icon
      )}
    </div>
  );
};
