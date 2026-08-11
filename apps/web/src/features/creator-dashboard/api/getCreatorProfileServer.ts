import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { creatorProfileSchema, type CreatorProfile } from "./creatorDashboardSchemas";

export const getCreatorProfileServer = async (
  accessToken: string,
): Promise<CreatorProfile | null> => {
  try {
    const raw = await serverApiRequest<CreatorProfile>("/creators/me", { accessToken });
    return creatorProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
