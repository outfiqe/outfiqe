import "server-only";

import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandProfile, brandProfileSchema } from "./brandProfileSchemas";

export const getBrandProfileServerPublic = async (id: string): Promise<BrandProfile | null> => {
  try {
    const session = await getServerSessionWithToken();
    const raw = await serverApiRequest<BrandProfile>(`/brands/${id}`, {
      accessToken: session?.accessToken,
    });
    return brandProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
