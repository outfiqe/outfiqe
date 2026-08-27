import { env } from "#config/env.config.js";

import { BADGE_LAYER_TYPE } from "./badge.constants.js";
import { type BadgeDesignConfig, badgeDesignConfigSchema } from "./badge.schemas.js";

export const parseDesignConfig = (raw: unknown): BadgeDesignConfig | null => {
  const parsed = badgeDesignConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

const managedUploadUrlPrefix = `${env.API_PUBLIC_URL}/uploads/`;

export const isManagedUploadUrl = (url: string): boolean => url.startsWith(managedUploadUrlPrefix);

export const collectDesignConfigImageUrls = (designConfig: BadgeDesignConfig): string[] => {
  if ("layers" in designConfig) {
    return designConfig.layers
      .filter((layer) => layer.type === BADGE_LAYER_TYPE.IMAGE)
      .map((layer) => layer.url);
  }
  return designConfig.imageUrl ? [designConfig.imageUrl] : [];
};

export const hasOnlyManagedImageUrls = (designConfig: BadgeDesignConfig): boolean =>
  collectDesignConfigImageUrls(designConfig).every(isManagedUploadUrl);
