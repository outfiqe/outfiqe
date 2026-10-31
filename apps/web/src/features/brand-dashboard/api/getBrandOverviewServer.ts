import "server-only";

import type { OverviewPeriodDays } from "@/shared/lib/overviewPeriod";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandOverview, brandOverviewSchema } from "./brandOverviewSchemas";

export const getBrandOverviewServer = async (
  accessToken: string,
  periodDays: OverviewPeriodDays,
): Promise<BrandOverview> => {
  const raw = await serverApiRequest<BrandOverview>(`/brands/me/overview?days=${periodDays}`, {
    accessToken,
  });
  return brandOverviewSchema.parse(raw);
};
