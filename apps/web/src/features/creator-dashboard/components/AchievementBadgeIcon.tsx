import { Lock } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import { type BadgeDesignConfig, type BadgeRarityValue, BadgeShape } from "../api/badgeSchemas";

const SHAPE_CLIP_PATH: Record<BadgeDesignConfig["shape"], string | undefined> = {
  [BadgeShape.CIRCLE]: undefined,
  [BadgeShape.DIAMOND]: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  [BadgeShape.SHIELD]: "polygon(50% 0%, 100% 20%, 100% 60%, 50% 100%, 0% 60%, 0% 20%)",
  [BadgeShape.STAR]:
    "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  [BadgeShape.HEXAGON]: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
};

const RARITY_RING: Record<BadgeRarityValue, string> = {
  COMMON: "ring-1 ring-border",
  UNCOMMON: "ring-2 ring-border",
  RARE: "ring-2 ring-offset-2 ring-offset-background",
  EPIC: "ring-[3px] ring-offset-2 ring-offset-background shadow-md",
  LEGENDARY: "ring-[3px] ring-offset-2 ring-offset-background shadow-lg",
  EXCLUSIVE: "ring-[3px] ring-offset-2 ring-offset-background shadow-xl",
};

const LOCKED_SIZE_CLASS = "size-14";

type AchievementBadgeIconProps = {
  icon: string;
  designConfig: BadgeDesignConfig;
  rarity: BadgeRarityValue;
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
  const clipPath = SHAPE_CLIP_PATH[designConfig.shape];

  return (
    <div
      aria-hidden
      className={cn(
        LOCKED_SIZE_CLASS,
        "flex shrink-0 items-center justify-center text-2xl",
        isLocked ? "bg-muted grayscale" : RARITY_RING[rarity],
        !clipPath && "rounded-full",
        className,
      )}
      style={{
        clipPath,
        backgroundColor: isLocked ? undefined : designConfig.primaryColor,
        ...(!isLocked && ({ "--tw-ring-color": designConfig.primaryColor } as React.CSSProperties)),
      }}
    >
      {isLocked ? <Lock className="size-5 text-muted-foreground" /> : icon}
    </div>
  );
};
