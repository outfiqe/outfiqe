import type { OutboxJobHandler, OutboxTopic } from "./outbox.types.js";
import { isOutboxTopic } from "./outbox.utils.js";

const handlersByTopic = new Map<OutboxTopic, OutboxJobHandler>();

export const registerOutboxHandler = (
  topic: OutboxTopic,
  handler: OutboxJobHandler,
): (() => void) => {
  if (handlersByTopic.has(topic)) {
    throw new Error(`An outbox handler is already registered for "${topic}"`);
  }
  handlersByTopic.set(topic, handler);
  return () => {
    handlersByTopic.delete(topic);
  };
};

export const findOutboxHandler = (topic: string): OutboxJobHandler | undefined =>
  isOutboxTopic(topic) ? handlersByTopic.get(topic) : undefined;
