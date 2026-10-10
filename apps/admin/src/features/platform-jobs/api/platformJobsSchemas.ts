import { z } from "zod";

export const jobsHealthSchema = z.object({
  outbox: z.object({
    unpublishedCount: z.number(),
    oldestUnpublishedAt: z.string().nullable(),
    stuckCount: z.number(),
  }),
  stuckEvents: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      attempts: z.number(),
      lastError: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  queues: z.array(
    z.object({
      name: z.string(),
      isReachable: z.boolean(),
      waiting: z.number(),
      active: z.number(),
      delayed: z.number(),
      failed: z.number(),
    }),
  ),
});

export const retriedJobsSchema = z.object({ retriedCount: z.number() });

export type JobsHealth = z.infer<typeof jobsHealthSchema>;
