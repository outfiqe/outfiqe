import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { brandProfileSchema, type BrandProfile } from "./brandDashboardSchemas";

export const getBrandProfileServer = async (accessToken: string): Promise<BrandProfile | null> => {
  try {
    const raw = await serverApiRequest<BrandProfile>("/brands/me", { accessToken });
    return brandProfileSchema.parse(raw);
  } catch {
    return null;
  }
};
