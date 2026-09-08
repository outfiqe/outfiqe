import { z } from "zod";

import type { ApiClient } from "../client";

const uploadResponseSchema = z.object({
  files: z.array(z.object({ url: z.string(), key: z.string() })),
});
type UploadResponse = z.infer<typeof uploadResponseSchema>;

const pipelineUploadResponseSchema = z.object({
  files: z.array(z.object({ url: z.string(), key: z.string(), assetId: z.string() })),
});
type PipelineUploadResponse = z.infer<typeof pipelineUploadResponseSchema>;

export type PipelineUploadedFile = { url: string; assetId: string };

export const createUploadsApi = (client: ApiClient) => ({
  async upload(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await client.post<UploadResponse>("/uploads", formData);
    return uploadResponseSchema.parse(res.data).files.map((file) => file.url);
  },

  async uploadWithPipeline(files: File[]): Promise<PipelineUploadedFile[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await client.post<PipelineUploadResponse>("/uploads/pipeline", formData);
    return pipelineUploadResponseSchema
      .parse(res.data)
      .files.map((file) => ({ url: file.url, assetId: file.assetId }));
  },
});
