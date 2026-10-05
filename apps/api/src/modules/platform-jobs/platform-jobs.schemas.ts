import { z } from "zod";

import { OUTBOX_QUEUE_NAME } from "#outbox/outbox.constants.js";

export const outboxEventIdParamSchema = z.object({ eventId: z.uuid() });

export const queueNameParamSchema = z.object({ queueName: z.enum(OUTBOX_QUEUE_NAME) });

export type OutboxEventIdParam = z.infer<typeof outboxEventIdParamSchema>;
export type QueueNameParam = z.infer<typeof queueNameParamSchema>;
