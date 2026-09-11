import "server-only";

import { getServerAccessToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type CreatorProfile, creatorProfileSchema } from "./creatorProfileSchemas";

export const getCreatorProfileServerPublic = async (
  handle: string,
): Promise<CreatorProfile | null> => {
  try {
    const accessToken = await getServerAccessToken();
    const raw = await serverApiRequest<CreatorProfile>(`/creators/by-handle/${handle}`, {
      accessToken: accessToken ?? undefined,
    });
    return creatorProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
