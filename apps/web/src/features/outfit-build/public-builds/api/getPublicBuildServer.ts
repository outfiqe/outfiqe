import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import {
  type PublicBuildDetail,
  publicBuildDetailSchema,
} from "../../social/api/outfitSocialSchemas";

const PUBLIC_BUILD_REVALIDATE_SECONDS = 60;

export const getPublicBuildServer = async (outfitId: string): Promise<PublicBuildDetail | null> => {
  try {
    const build = await serverApiRequest<unknown>(`/outfits/${outfitId}/public`, {
      revalidateSeconds: PUBLIC_BUILD_REVALIDATE_SECONDS,
    });
    return publicBuildDetailSchema.parse(build);
  } catch {
    return null;
  }
};
