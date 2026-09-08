import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandOverview, brandOverviewSchema } from "./brandOverviewSchemas";

export const getBrandOverviewServer = async (accessToken: string): Promise<BrandOverview> => {
  const raw = await serverApiRequest<BrandOverview>("/brands/me/overview", { accessToken });
  return brandOverviewSchema.parse(raw);
};
