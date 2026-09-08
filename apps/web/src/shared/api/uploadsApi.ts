import { createUploadsApi } from "@outfiqe/client";

import { apiClient } from "@/shared/lib/apiClient";

export const uploadsApi = createUploadsApi(apiClient);

export const uploadImagesThroughPipeline = (
  files: File[],
): Promise<{ url: string; imageAssetId: string }[]> =>
  uploadsApi
    .uploadWithPipeline(files)
    .then((uploaded) => uploaded.map((file) => ({ url: file.url, imageAssetId: file.assetId })));
