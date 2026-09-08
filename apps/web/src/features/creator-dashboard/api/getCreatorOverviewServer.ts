import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type CreatorOverview, creatorOverviewSchema } from "./creatorOverviewSchemas";

export const getCreatorOverviewServer = async (accessToken: string): Promise<CreatorOverview> => {
  const raw = await serverApiRequest<CreatorOverview>("/creators/me/overview", { accessToken });
  return creatorOverviewSchema.parse(raw);
};
