import type { Redis } from "ioredis";

import { DEAD_LETTER_SUFFIX, STREAM_MAX_LEN } from "./event-bus.constants.js";
import type { DomainEvent, DomainEventPayloads } from "./event-bus.types.js";

export const serializeEventPayload = <E extends DomainEvent>(
  payload: DomainEventPayloads[E],
): string => JSON.stringify(payload);

export const parseEventPayload = <E extends DomainEvent>(raw: string): DomainEventPayloads[E] =>
  JSON.parse(raw) as DomainEventPayloads[E];

export const extractPayloadField = (fields: string[]): string | undefined => {
  const fieldIndex = fields.indexOf("payload");
  return fieldIndex === -1 ? undefined : fields[fieldIndex + 1];
};

export const publishToDeadLetter = async (
  redisClient: Redis,
  streamKey: string,
  originalId: string,
  payload: string,
): Promise<void> => {
  await redisClient.xadd(
    `${streamKey}${DEAD_LETTER_SUFFIX}`,
    "MAXLEN",
    "~",
    STREAM_MAX_LEN,
    "*",
    "originalId",
    originalId,
    "payload",
    payload,
  );
};
