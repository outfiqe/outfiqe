import "server-only";

import type { OverviewPeriodDays } from "@/shared/lib/overviewPeriod";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type CreatorOverview, creatorOverviewSchema } from "./creatorOverviewSchemas";

export const getCreatorOverviewServer = async (
  accessToken: string,
  periodDays: OverviewPeriodDays,
): Promise<CreatorOverview> => {
  const raw = await serverApiRequest<CreatorOverview>(`/creators/me/overview?days=${periodDays}`, {
    accessToken,
  });
  return creatorOverviewSchema.parse(raw);
};
