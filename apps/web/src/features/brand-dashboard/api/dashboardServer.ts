import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import {
  type BrandShipmentDetail,
  brandShipmentDetailSchema,
  type BrandShipmentsPage,
  brandShipmentsPageSchema,
} from "./brandFulfilmentSchemas";
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

export const getBrandShipmentsFirstPageServer = async (
  accessToken: string,
): Promise<BrandShipmentsPage> => {
  const raw = await serverApiRequest<BrandShipmentsPage>("/orders/brand/fulfilment-groups", {
    accessToken,
  });
  return brandShipmentsPageSchema.parse(raw);
};

export const getBrandShipmentServer = async (
  accessToken: string,
  groupId: string,
): Promise<BrandShipmentDetail> => {
  const raw = await serverApiRequest<BrandShipmentDetail>(
    `/orders/brand/fulfilment-groups/${groupId}`,
    { accessToken },
  );
  return brandShipmentDetailSchema.parse(raw);
};
