import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandOrdersPage, brandOrdersPageSchema } from "./brandOrdersSchemas";
import { type BrandPayoutSummary, brandPayoutSummarySchema } from "./brandPayoutSchemas";
import { type BrandProductPage, brandProductPageSchema } from "./brandProductsSchemas";

export const getBrandPayoutSummaryServer = async (
  accessToken: string,
): Promise<BrandPayoutSummary> => {
  const raw = await serverApiRequest<BrandPayoutSummary>("/brand-payouts/me/summary", {
    accessToken,
  });
  return brandPayoutSummarySchema.parse(raw);
};

export const getBrandProductsFirstPageServer = async (
  accessToken: string,
): Promise<BrandProductPage> => {
  const raw = await serverApiRequest<BrandProductPage>("/products/mine", { accessToken });
  return brandProductPageSchema.parse(raw);
};

export const getBrandOrdersFirstPageServer = async (
  accessToken: string,
): Promise<BrandOrdersPage> => {
  const raw = await serverApiRequest<BrandOrdersPage>("/orders/brand", { accessToken });
  return brandOrdersPageSchema.parse(raw);
};
