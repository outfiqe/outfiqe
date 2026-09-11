import "server-only";

import { getServerAccessToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandPage, brandPageSchema } from "./brandsSchemas";

export const getBrandsFirstPageServer = async (): Promise<BrandPage> => {
  const accessToken = await getServerAccessToken();
  const raw = await serverApiRequest<BrandPage>("/brands", {
    accessToken: accessToken ?? undefined,
  });
  return brandPageSchema.parse(raw);
};
