import "server-only";

import { getServerAccessToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandProfile, brandProfileSchema } from "./brandProfileSchemas";

export const getBrandProfileServerPublic = async (id: string): Promise<BrandProfile | null> => {
  try {
    const accessToken = await getServerAccessToken();
    const raw = await serverApiRequest<BrandProfile>(`/brands/${id}`, {
      accessToken: accessToken ?? undefined,
    });
    return brandProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
