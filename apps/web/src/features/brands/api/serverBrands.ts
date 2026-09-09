import "server-only";

import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BrandPage, brandPageSchema } from "./brandsSchemas";

export const getBrandsFirstPageServer = async (): Promise<BrandPage> => {
  const session = await getServerSessionWithToken();
  const raw = await serverApiRequest<BrandPage>("/brands", {
    accessToken: session?.accessToken,
  });
  return brandPageSchema.parse(raw);
};
