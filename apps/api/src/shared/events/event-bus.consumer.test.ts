import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_DELIVERY_ATTEMPTS } from "./event-bus.constants.js";
import { stopDomainEventConsumers, subscribeToDomainEvent } from "./event-bus.consumer.js";
import { DomainEvents } from "./event-bus.js";

const streamClient = vi.hoisted(() => ({
  on: vi.fn(),
  xgroup: vi.fn(),
  xautoclaim: vi.fn(),
  xpending: vi.fn(),
  xreadgroup: vi.fn(),
  xack: vi.fn(),
  xadd: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  status: "ready",
}));

vi.mock("#redis/redis.client.js", () => ({ redis: { duplicate: () => streamClient } }));

vi.mock("#lib/backoff.utils.js", () => ({
  computeBackoffDelayMs: vi.fn(() => 0),
  waitMs: vi.fn(() => Promise.resolve()),
}));

vi.mock("#lib/winston.utils.js", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const REDIS_UNREACHABLE_ERROR = new Error("Reached the max retries per request limit (which is 3)");
const ENTRY_ID = "1-0";
const STREAM_ENTRIES_RESULT = [
  ["stream", [[ENTRY_ID, ["payload", JSON.stringify({ userId: "user-1" })]]]],
];

const acknowledgedEntryPromise = () =>
  new Promise<void>((resolve) => {
    streamClient.xack.mockImplementation(async () => {
      void stopDomainEventConsumers();
      resolve();
      return 1;
    });
  });

const subscribeWithHandler = (handler: () => Promise<void>) =>
  subscribeToDomainEvent({
    event: DomainEvents.USER_CREATED,
    groupName: "test-group",
    handler,
  });

beforeEach(async () => {
  vi.clearAllMocks();
  streamClient.status = "ready";
  streamClient.xautoclaim.mockResolvedValue(["0-0", []]);
  streamClient.xreadgroup.mockResolvedValue(null);
  streamClient.xack.mockResolvedValue(1);
  streamClient.quit.mockResolvedValue("OK");
});

describe("subscribeToDomainEvent", () => {
  it("keeps retrying consumer group setup until redis is reachable, then processes entries", async () => {
    streamClient.xgroup
      .mockRejectedValueOnce(REDIS_UNREACHABLE_ERROR)
      .mockRejectedValueOnce(REDIS_UNREACHABLE_ERROR)
      .mockResolvedValue("OK");
    streamClient.xreadgroup.mockResolvedValueOnce(STREAM_ENTRIES_RESULT);
    const handler = vi.fn().mockResolvedValue(undefined);
    streamClient.xack.mockImplementation(async () => {
      void stopDomainEventConsumers();
      return 1;
    });

    subscribeWithHandler(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    await stopDomainEventConsumers();

    expect(streamClient.xgroup).toHaveBeenCalledTimes(3);
    expect(streamClient.xack).toHaveBeenCalledWith(expect.any(String), "test-group", ENTRY_ID);
  });

  it("treats an already existing consumer group as ready", async () => {
    streamClient.xgroup.mockRejectedValue(
      new Error("BUSYGROUP Consumer Group name already exists"),
    );
    const handler = vi.fn().mockResolvedValue(undefined);
    streamClient.xreadgroup.mockResolvedValueOnce(STREAM_ENTRIES_RESULT);
    streamClient.xack.mockImplementation(async () => {
      void stopDomainEventConsumers();
      return 1;
    });

    subscribeWithHandler(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    await stopDomainEventConsumers();

    expect(streamClient.xgroup).toHaveBeenCalledTimes(1);
  });

  it("stops cleanly while consumer group setup is still failing", async () => {
    streamClient.xgroup.mockRejectedValue(REDIS_UNREACHABLE_ERROR);
    const handler = vi.fn();

    subscribeWithHandler(handler);
    await vi.waitFor(() => expect(streamClient.xgroup).toHaveBeenCalled());
    await stopDomainEventConsumers();

    expect(streamClient.disconnect).toHaveBeenCalledTimes(1);
    expect(streamClient.xreadgroup).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    expect(streamClient.quit).toHaveBeenCalledTimes(1);
  });
  it("acknowledges an entry that was trimmed from the stream before delivery", async () => {
    streamClient.xgroup.mockResolvedValue("OK");
    streamClient.xreadgroup.mockResolvedValueOnce([["stream", [[ENTRY_ID, null]]]]);
    const handler = vi.fn();
    const ackedEntry = acknowledgedEntryPromise();

    subscribeWithHandler(handler);
    await ackedEntry;
    await stopDomainEventConsumers();

    expect(handler).not.toHaveBeenCalled();
  });

  it("moves an entry without a payload to the dead-letter stream", async () => {
    streamClient.xgroup.mockResolvedValue("OK");
    streamClient.xadd.mockResolvedValue("1-1");
    streamClient.xreadgroup.mockResolvedValueOnce([["stream", [[ENTRY_ID, ["other", "x"]]]]]);
    const handler = vi.fn();
    const ackedEntry = acknowledgedEntryPromise();

    subscribeWithHandler(handler);
    await ackedEntry;
    await stopDomainEventConsumers();

    expect(handler).not.toHaveBeenCalled();
    expect(streamClient.xadd).toHaveBeenCalledTimes(1);
  });

  it("leaves an entry pending when its handler throws", async () => {
    streamClient.xgroup.mockResolvedValue("OK");
    streamClient.xreadgroup.mockResolvedValueOnce(STREAM_ENTRIES_RESULT);
    const handler = vi.fn().mockImplementation(async () => {
      void stopDomainEventConsumers();
      throw new Error("handler failed");
    });

    subscribeWithHandler(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    await stopDomainEventConsumers();

    expect(streamClient.xack).not.toHaveBeenCalled();
  });

  it("reprocesses stuck entries claimed from other consumers", async () => {
    streamClient.xgroup.mockResolvedValue("OK");
    streamClient.xautoclaim.mockResolvedValueOnce([
      "0-0",
      [[ENTRY_ID, ["payload", JSON.stringify({ userId: "user-1" })]]],
    ]);
    streamClient.xpending.mockResolvedValue([[ENTRY_ID, "consumer", 1000, 2]]);
    const handler = vi.fn().mockResolvedValue(undefined);
    const ackedEntry = acknowledgedEntryPromise();

    subscribeWithHandler(handler);
    await ackedEntry;
    await stopDomainEventConsumers();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("dead-letters a claimed entry that has exhausted its delivery attempts", async () => {
    streamClient.xgroup.mockResolvedValue("OK");
    streamClient.xadd.mockResolvedValue("1-1");
    streamClient.xautoclaim.mockResolvedValueOnce([
      "0-0",
      [[ENTRY_ID, ["payload", JSON.stringify({ userId: "user-1" })]]],
    ]);
    streamClient.xpending.mockResolvedValue([
      [ENTRY_ID, "consumer", 1000, MAX_DELIVERY_ATTEMPTS + 1],
    ]);
    const handler = vi.fn();
    const ackedEntry = acknowledgedEntryPromise();

    subscribeWithHandler(handler);
    await ackedEntry;
    await stopDomainEventConsumers();

    expect(handler).not.toHaveBeenCalled();
    expect(streamClient.xadd).toHaveBeenCalledTimes(1);
  });

  it("recreates a missing consumer group and keeps reading after a loop error", async () => {
    streamClient.xgroup.mockResolvedValue("OK");
    streamClient.xautoclaim.mockRejectedValueOnce(new Error("NOGROUP No such consumer group"));
    streamClient.xreadgroup.mockResolvedValueOnce(STREAM_ENTRIES_RESULT);
    const handler = vi.fn().mockResolvedValue(undefined);
    streamClient.xack.mockImplementation(async () => {
      void stopDomainEventConsumers();
      return 1;
    });

    subscribeWithHandler(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    await stopDomainEventConsumers();

    expect(streamClient.xgroup).toHaveBeenCalledTimes(2);
  });
});
