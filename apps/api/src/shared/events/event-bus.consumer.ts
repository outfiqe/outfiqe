import { hostname } from "node:os";

import { computeBackoffDelayMs, waitMs } from "#lib/backoff.utils.js";
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
import {
  extractPayloadField,
  isMissingConsumerGroupError,
  parseEventPayload,
  publishToDeadLetter,
} from "./event-bus.utils.js";

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

type ConsumerContext<E extends DomainEvent> = SubscribeOptions<E> & {
  streamKey: string;
  consumerName: string;
  streamClient: ReturnType<typeof redis.duplicate>;
  isStopped: () => boolean;
};

const STREAM_BEGINNING_ID = "0";
const UNDELIVERED_ENTRIES_ID = ">";
const CONSUMER_GROUP_ALREADY_EXISTS_ERROR = "BUSYGROUP";
const CONSUMER_GROUP_READY = true;
const FIRST_DELIVERY_ATTEMPT = 1;
const EXHAUSTED_DELIVERY_COUNT = MAX_DELIVERY_ATTEMPTS + 1;
const STREAM_CLIENT_ENDED_STATUS = "end";

const activeConsumers: ConsumerHandle[] = [];

const deliverToDeadLetter = async <E extends DomainEvent>(
  { event, groupName, streamKey, streamClient }: ConsumerContext<E>,
  id: string,
  rawPayload: string | undefined,
): Promise<void> => {
  await publishToDeadLetter(streamClient, streamKey, id, rawPayload ?? "");
  await streamClient.xack(streamKey, groupName, id);
  logger.error(`Domain event moved to dead-letter: ${event} id=${id}`);
};

const processEntry = async <E extends DomainEvent>(
  context: ConsumerContext<E>,
  { id, fields }: StreamEntry,
  deliveryCount: number,
): Promise<void> => {
  const { event, groupName, handler, streamKey, streamClient } = context;

  if (!fields) {
    logger.warn(`Domain event entry trimmed before delivery: ${event} id=${id}`);
    await streamClient.xack(streamKey, groupName, id);
    return;
  }

  const rawPayload = extractPayloadField(fields);
  if (!rawPayload || deliveryCount > MAX_DELIVERY_ATTEMPTS) {
    await deliverToDeadLetter(context, id, rawPayload);
    return;
  }

  try {
    await handler(parseEventPayload<E>(rawPayload), { eventId: `${event}:${id}` });
    await streamClient.xack(streamKey, groupName, id);
  } catch (error) {
    logger.error(
      `Domain event handler failed: ${event} id=${id} attempt=${deliveryCount}: ${describeError(error)}`,
    );
  }
};

const claimStuckEntries = async <E extends DomainEvent>(
  context: ConsumerContext<E>,
): Promise<void> => {
  const { groupName, streamKey, consumerName, streamClient } = context;
  const claimResult = await streamClient.xautoclaim(
    streamKey,
    groupName,
    consumerName,
    CLAIM_IDLE_MS,
    STREAM_BEGINNING_ID,
    "COUNT",
    CONSUMER_BATCH_SIZE,
  );
  const claimedEntries = toStreamEntries(Array.isArray(claimResult) ? claimResult[1] : undefined);
  const firstEntry = claimedEntries[0];
  const lastEntry = claimedEntries.at(-1);
  if (!firstEntry || !lastEntry) return;

  const pendingRaw = await streamClient.xpending(
    streamKey,
    groupName,
    firstEntry.id,
    lastEntry.id,
    claimedEntries.length,
  );
  const deliveryCounts = new Map(
    toPendingEntries(pendingRaw).map(({ id, deliveryCount }) => [id, deliveryCount]),
  );

  for (const entry of claimedEntries) {
    await processEntry(context, entry, deliveryCounts.get(entry.id) ?? EXHAUSTED_DELIVERY_COUNT);
  }
};

const readNewEntries = async <E extends DomainEvent>(
  context: ConsumerContext<E>,
): Promise<void> => {
  const { groupName, streamKey, consumerName, streamClient } = context;
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
    UNDELIVERED_ENTRIES_ID,
  );
  const streamResult = result?.[0];
  if (!streamResult) return;

  const [, items] = streamResult;
  for (const [id, fields] of items) {
    await processEntry(context, { id, fields }, FIRST_DELIVERY_ATTEMPT);
  }
};

const ensureConsumerGroup = async <E extends DomainEvent>({
  event,
  groupName,
  streamKey,
  streamClient,
}: ConsumerContext<E>): Promise<boolean> => {
  try {
    await streamClient.xgroup("CREATE", streamKey, groupName, STREAM_BEGINNING_ID, "MKSTREAM");
    return CONSUMER_GROUP_READY;
  } catch (error) {
    const groupAlreadyExists = describeError(error).includes(CONSUMER_GROUP_ALREADY_EXISTS_ERROR);
    if (!groupAlreadyExists) {
      logger.error(
        `Failed to create consumer group ${groupName} for ${event}: ${describeError(error)}`,
      );
    }
    return groupAlreadyExists;
  }
};

const runConsumerLoop = async <E extends DomainEvent>(
  context: ConsumerContext<E>,
): Promise<void> => {
  const { event, streamClient, isStopped } = context;
  if (!(await ensureConsumerGroup(context))) return;

  let consecutiveErrorCount = 0;

  while (!isStopped()) {
    try {
      await claimStuckEntries(context);
      await readNewEntries(context);
      consecutiveErrorCount = 0;
    } catch (error) {
      if (isStopped()) break;
      logger.error(`Domain event consumer loop error: ${event}: ${describeError(error)}`);
      if (isMissingConsumerGroupError(error)) await ensureConsumerGroup(context);
      await waitMs(computeBackoffDelayMs(consecutiveErrorCount));
      consecutiveErrorCount += 1;
    }
  }

  if (streamClient.status !== STREAM_CLIENT_ENDED_STATUS) await streamClient.quit();
};

export const subscribeToDomainEvent = <E extends DomainEvent>({
  event,
  groupName,
  handler,
}: SubscribeOptions<E>): void => {
  const streamClient = redis.duplicate();
  attachRedisLifecycleLogging(streamClient, `stream-consumer:${event}:${groupName}`);

  let stopped = false;

  activeConsumers.push({
    stop: () => {
      stopped = true;
      streamClient.disconnect();
    },
    loopDone: runConsumerLoop({
      event,
      groupName,
      handler,
      streamKey: redisKeys.stream(event),
      consumerName: `${hostname()}:${process.pid}`,
      streamClient,
      isStopped: () => stopped,
    }),
  });
};

export const stopDomainEventConsumers = async (): Promise<void> => {
  for (const consumer of activeConsumers) consumer.stop();
  await Promise.all(activeConsumers.map((consumer) => consumer.loopDone));
  activeConsumers.length = 0;
};
