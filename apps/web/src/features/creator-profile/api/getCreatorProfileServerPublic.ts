import "server-only";

import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type CreatorProfile, creatorProfileSchema } from "./creatorProfileSchemas";

export const getCreatorProfileServerPublic = async (
  handle: string,
): Promise<CreatorProfile | null> => {
  try {
    const session = await getServerSessionWithToken();
    const raw = await serverApiRequest<CreatorProfile>(`/creators/by-handle/${handle}`, {
      accessToken: session?.accessToken,
    });
    return creatorProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
