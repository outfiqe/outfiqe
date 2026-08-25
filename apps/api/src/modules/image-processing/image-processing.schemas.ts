import { z } from "zod";

export const getImageAssetParamsSchema = z.object({
  assetId: z.uuid(),
});

export type GetImageAssetParams = z.infer<typeof getImageAssetParamsSchema>;
