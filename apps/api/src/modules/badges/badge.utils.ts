import { type BadgeDesignConfig, badgeDesignConfigSchema } from "./badge.schemas.js";

export const parseDesignConfig = (raw: unknown): BadgeDesignConfig | null => {
  const parsed = badgeDesignConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};
