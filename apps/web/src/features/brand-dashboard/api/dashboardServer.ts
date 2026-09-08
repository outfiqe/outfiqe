import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandPayoutSummary, brandPayoutSummarySchema } from "./brandPayoutSchemas";

export const getBrandPayoutSummaryServer = async (
  accessToken: string,
): Promise<BrandPayoutSummary> => {
  const raw = await serverApiRequest<BrandPayoutSummary>("/brand-payouts/me/summary", {
    accessToken,
  });
  return brandPayoutSummarySchema.parse(raw);
};
