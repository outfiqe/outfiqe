import type { FeaturedBadge } from "@/features/creator-dashboard/badges/api/badgeSchemas";

const TITLE_BADGE_FALLBACK_COLOR = "#146c78";

export const badgeAccentColor = (designConfig: FeaturedBadge["designConfig"]): string => {
  if ("primaryColor" in designConfig) return designConfig.primaryColor;
  const backgroundLayer = designConfig.layers.find((layer) => layer.type === "background");
  return backgroundLayer?.fill ?? TITLE_BADGE_FALLBACK_COLOR;
};
