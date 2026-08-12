import { z } from "zod";

import type { ApiClient } from "../client";

const uploadResponseSchema = z.object({
  files: z.array(z.object({ url: z.string(), key: z.string() })),
});
type UploadResponse = z.infer<typeof uploadResponseSchema>;

export const createUploadsApi = (client: ApiClient) => ({
  async upload(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await client.post<UploadResponse>("/uploads", formData);
    return uploadResponseSchema.parse(res.data).files.map((file) => file.url);
  },
});
