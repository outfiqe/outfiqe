import { z } from "zod";

export const bagTagBatchSummarySchema = z.object({
  id: z.string(),
  hubId: z.string(),
  hubName: z.string(),
  tagCount: z.number(),
  usedTagCount: z.number(),
  createdAt: z.string(),
});
export type BagTagBatchSummary = z.infer<typeof bagTagBatchSummarySchema>;

export const bagTagBatchesPageSchema = z.object({
  items: z.array(bagTagBatchSummarySchema),
  nextCursor: z.string().nullable(),
});
export type BagTagBatchesPage = z.infer<typeof bagTagBatchesPageSchema>;

export const bagTagBatchSheetSchema = bagTagBatchSummarySchema.extend({
  tags: z.array(z.object({ code: z.string(), isUsed: z.boolean() })),
});
export type BagTagBatchSheet = z.infer<typeof bagTagBatchSheetSchema>;
