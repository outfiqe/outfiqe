import type { BadgeAnimation, BadgeRarity, BadgeShape } from "@outfiqe/types";
import type { CSSProperties } from "react";

export const SHAPE_CLIP_PATH: Record<BadgeShape, string | undefined> = {
  circle: undefined,
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  shield: "polygon(50% 0%, 100% 20%, 100% 60%, 50% 100%, 0% 60%, 0% 20%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
};

export const RARITY_RING: Record<BadgeRarity, string> = {
  COMMON: "ring-1 ring-border",
  UNCOMMON: "ring-2 ring-border",
  RARE: "ring-2 ring-offset-2 ring-offset-background",
  EPIC: "ring-[3px] ring-offset-2 ring-offset-background shadow-md",
  LEGENDARY: "ring-[3px] ring-offset-2 ring-offset-background shadow-lg",
  EXCLUSIVE: "ring-[3px] ring-offset-2 ring-offset-background shadow-xl",
};

export const RARITY_DEFAULT_ANIMATION: Record<BadgeRarity, BadgeAnimation> = {
  COMMON: "none",
  UNCOMMON: "none",
  RARE: "glow",
  EPIC: "shimmer",
  LEGENDARY: "pulse",
  EXCLUSIVE: "radiant",
};

export const ANIMATION_CLASS: Record<BadgeAnimation, string | undefined> = {
  none: undefined,
  glow: "animate-badge-glow",
  shimmer: "animate-badge-shimmer",
  pulse: "animate-badge-pulse",
  radiant: "animate-badge-radiant",
};

export const SHIMMER_OVERLAY_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
  backgroundSize: "250% 100%",
};

export const LOCKED_SIZE_CLASS = "size-14";

export const LAYER_FONT_WEIGHT_CLASS: Record<"normal" | "bold", string> = {
  normal: "font-normal",
  bold: "font-bold",
};

export const BADGE_ICON_REFERENCE_SIZE_PX = 56;
