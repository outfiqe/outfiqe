import type { ContentReportTarget } from "@outfiqe/types";

export const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

import type { ContentReport } from "./schemas";

export const TARGET_NOUN: Record<ContentReportTarget, string> = {
  CREATOR_LOOK: "post",
  CREATOR_LOOK_COMMENT: "comment",
  OUTFIT_BUILD: "build",
  OUTFIT_BUILD_COMMENT: "build comment",
};

export const reportedContentHref = (
  target: NonNullable<ContentReport["target"]>,
): string | null => {
  if (target.outfitId) return `${WEB_URL}/builds/${target.outfitId}`;
  if (target.lookId) return `${WEB_URL}/creator/${target.author.handle}?look=${target.lookId}`;
  return null;
};
