import { hostname } from "node:os";

import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { attachRedisLifecycleLogging, describeError } from "#redis/redis.utils.js";

import {
  CLAIM_IDLE_MS,
  CONSUMER_BATCH_SIZE,
  CONSUMER_BLOCK_MS,
  MAX_DELIVERY_ATTEMPTS,
} from "./event-bus.constants.js";
import type { DomainEvent, DomainEventHandler } from "./event-bus.types.js";
import { extractPayloadField, parseEventPayload, publishToDeadLetter } from "./event-bus.utils.js";

type StreamEntry = { id: string; fields: string[] | null };
type PendingEntry = { id: string; deliveryCount: number };

const toStreamEntries = (raw: unknown): StreamEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry): entry is [string, unknown] => Array.isArray(entry) && typeof entry[0] === "string",
    )
    .map(([id, fields]) => ({ id, fields: Array.isArray(fields) ? fields : null }));
};

const toPendingEntries = (raw: unknown): PendingEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is unknown[] => Array.isArray(entry) && entry.length === 4)
    .map(([id, , , deliveryCount]) => ({ id: String(id), deliveryCount: Number(deliveryCount) }));
};

type SubscribeOptions<E extends DomainEvent> = {
  event: E;
  groupName: string;
  handler: DomainEventHandler<E>;
};

type ConsumerHandle = { stop: () => void; loopDone: Promise<void> };

const activeConsumers: ConsumerHandle[] = [];

export const subscribeToDomainEvent = <E extends DomainEvent>({
  event,
  groupName,
  handler,
}: SubscribeOptions<E>): void => {
  const streamKey = redisKeys.stream(event);
  const consumerName = `${hostname()}:${process.pid}`;
  const streamClient = redis.duplicate();
  attachRedisLifecycleLogging(streamClient, `stream-consumer:${event}:${groupName}`);

  let stopped = false;

  const deliverToDeadLetter = async (id: string, rawPayload: string | undefined): Promise<void> => {
    await publishToDeadLetter(streamClient, streamKey, id, rawPayload ?? "");
    await streamClient.xack(streamKey, groupName, id);
    logger.error(`Domain event moved to dead-letter: ${event} id=${id}`);
  };

  const processEntry = async (
    { id, fields }: StreamEntry,
    deliveryCount: number,
  ): Promise<void> => {
    // Fields are null when the entry was already trimmed from the stream (MAXLEN) while still
    // pending for this group — there's nothing left to retry or dead-letter, just clear the PEL.
    if (!fields) {
      logger.warn(`Domain event entry trimmed before delivery: ${event} id=${id}`);
      await streamClient.xack(streamKey, groupName, id);
      return;
    }

    const rawPayload = extractPayloadField(fields);
    if (!rawPayload || deliveryCount > MAX_DELIVERY_ATTEMPTS) {
      await deliverToDeadLetter(id, rawPayload);
      return;
    }

    try {
      await handler(parseEventPayload<E>(rawPayload));
      await streamClient.xack(streamKey, groupName, id);
    } catch (error) {
      logger.error(
        `Domain event handler failed: ${event} id=${id} attempt=${deliveryCount}: ${describeError(error)}`,
      );
    }
  };

  const claimStuckEntries = async (): Promise<void> => {
    const claimResult = await streamClient.xautoclaim(
      streamKey,
      groupName,
      consumerName,
      CLAIM_IDLE_MS,
      "0",
      "COUNT",
      CONSUMER_BATCH_SIZE,
    );
    const claimedEntries = toStreamEntries(Array.isArray(claimResult) ? claimResult[1] : undefined);
    const firstEntry = claimedEntries[0];
    const lastEntry = claimedEntries.at(-1);
    if (!firstEntry || !lastEntry) return;

    const firstId = firstEntry.id;
    const lastId = lastEntry.id;
    const pendingRaw = await streamClient.xpending(
      streamKey,
      groupName,
      firstId,
      lastId,
      claimedEntries.length,
    );
    const deliveryCounts = new Map(
      toPendingEntries(pendingRaw).map(({ id, deliveryCount }) => [id, deliveryCount]),
    );

    for (const entry of claimedEntries) {
      await processEntry(entry, deliveryCounts.get(entry.id) ?? MAX_DELIVERY_ATTEMPTS + 1);
    }
  };

  const readNewEntries = async (): Promise<void> => {
    const result = await streamClient.xreadgroup(
      "GROUP",
      groupName,
      consumerName,
      "COUNT",
      CONSUMER_BATCH_SIZE,
      "BLOCK",
      CONSUMER_BLOCK_MS,
      "STREAMS",
      streamKey,
      ">",
    );
    const streamResult = result?.[0];
    if (!streamResult) return;

    const [, items] = streamResult;
    for (const [id, fields] of items) {
      await processEntry({ id, fields }, 1);
    }
  };

  const runLoop = async (): Promise<void> => {
    try {
      await streamClient.xgroup("CREATE", streamKey, groupName, "0", "MKSTREAM");
    } catch (error) {
      if (!describeError(error).includes("BUSYGROUP")) {
        logger.error(
          `Failed to create consumer group ${groupName} for ${event}: ${describeError(error)}`,
        );
        return;
      }
    }

    while (!stopped) {
      try {
        await claimStuckEntries();
        await readNewEntries();
      } catch (error) {
        logger.error(`Domain event consumer loop error: ${event}: ${describeError(error)}`);
      }
    }

    await streamClient.quit();
  };

  activeConsumers.push({
    stop: () => {
      stopped = true;
    },
    loopDone: runLoop(),
  });
};

export const stopDomainEventConsumers = async (): Promise<void> => {
  for (const consumer of activeConsumers) consumer.stop();
  await Promise.all(activeConsumers.map((consumer) => consumer.loopDone));
  activeConsumers.length = 0;
};
