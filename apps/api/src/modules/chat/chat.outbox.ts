import { z } from "zod";

import { DomainEvents, eventBus } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { registerOutboxHandler } from "#outbox/outbox.handlers.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";

import { messageRepository } from "./messages/message.repository.js";
import { toMessageBroadcast } from "./messages/message.utils.js";

const chatMessageCreatedPayloadSchema = z.object({
  messageId: z.uuid(),
  recipientIds: z.array(z.uuid()),
});

const chatMemberRemovedPayloadSchema = z.object({
  conversationId: z.uuid(),
  userId: z.uuid(),
});

const warnUnreadablePayload = ({ outboxEventId }: OutboxJobData, topic: string): void => {
  logger.error(`Outbox event ${outboxEventId} for ${topic} has an unreadable payload; skipped`);
};

export const announceChatMessageCreated = async (job: OutboxJobData): Promise<void> => {
  const parsed = chatMessageCreatedPayloadSchema.safeParse(job.payload);
  if (!parsed.success) return warnUnreadablePayload(job, OUTBOX_TOPIC.CHAT_MESSAGE_CREATED);

  const { messageId, recipientIds } = parsed.data;
  const message = await messageRepository.findById(messageId);
  if (!message) return;

  await eventBus.publish(DomainEvents.MESSAGE_CREATED, toMessageBroadcast(message, recipientIds));
};

export const announceChatMemberRemoved = async (job: OutboxJobData): Promise<void> => {
  const parsed = chatMemberRemovedPayloadSchema.safeParse(job.payload);
  if (!parsed.success) return warnUnreadablePayload(job, OUTBOX_TOPIC.CHAT_MEMBER_REMOVED);

  await eventBus.publish(DomainEvents.CONVERSATION_MEMBER_REMOVED, parsed.data);
};

export const registerChatOutboxHandlers = (): void => {
  registerOutboxHandler(OUTBOX_TOPIC.CHAT_MESSAGE_CREATED, announceChatMessageCreated);
  registerOutboxHandler(OUTBOX_TOPIC.CHAT_MEMBER_REMOVED, announceChatMemberRemoved);
};
