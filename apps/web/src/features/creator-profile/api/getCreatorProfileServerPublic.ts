import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { creatorProfileSchema, type CreatorProfile } from "./creatorProfileSchemas";

export const getCreatorProfileServerPublic = async (
  handle: string,
): Promise<CreatorProfile | null> => {
  try {
    const raw = await serverApiRequest<CreatorProfile>(`/creators/by-handle/${handle}`);
    return creatorProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
