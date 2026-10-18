import { z } from "zod";

const MIN_TAGS_PER_BATCH = 1;
const MAX_TAGS_PER_BATCH = 500;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const createBagTagBatchSchema = z.object({
  hubId: z.uuid(),
  tagCount: z.number().int().min(MIN_TAGS_PER_BATCH).max(MAX_TAGS_PER_BATCH),
});

export const listBagTagBatchesQuerySchema = z.object({
  hubId: z.uuid().optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const bagTagBatchIdParamSchema = z.object({ batchId: z.uuid() });

export type CreateBagTagBatchBody = z.infer<typeof createBagTagBatchSchema>;
export type ListBagTagBatchesQuery = z.infer<typeof listBagTagBatchesQuerySchema>;
export type BagTagBatchIdParam = z.infer<typeof bagTagBatchIdParamSchema>;
