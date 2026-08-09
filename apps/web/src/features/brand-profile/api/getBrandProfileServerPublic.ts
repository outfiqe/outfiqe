import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { brandProfileSchema, type BrandProfile } from "./brandProfileSchemas";

export const getBrandProfileServerPublic = async (id: string): Promise<BrandProfile | null> => {
  try {
    const raw = await serverApiRequest<BrandProfile>(`/brands/${id}`);
    return brandProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
