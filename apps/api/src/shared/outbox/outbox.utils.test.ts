import { describe, expect, it } from "vitest";

import {
  OUTBOX_LAST_ERROR_MAX_LENGTH,
  OUTBOX_QUEUE_NAME,
  OUTBOX_TOPIC,
} from "./outbox.constants.js";
import {
  isOutboxTopic,
  queueNameForOutboxTopic,
  toQueueConnectionOptions,
  truncateOutboxError,
} from "./outbox.utils.js";

describe("isOutboxTopic", () => {
  it("accepts a known topic and rejects anything else", () => {
    expect(isOutboxTopic(OUTBOX_TOPIC.STOCK_CHANGED)).toBe(true);
    expect(isOutboxTopic("stock.renamed")).toBe(false);
  });
});

describe("queueNameForOutboxTopic", () => {
  it("sends stock changes to the inventory queue", () => {
    expect(queueNameForOutboxTopic(OUTBOX_TOPIC.STOCK_CHANGED)).toBe(OUTBOX_QUEUE_NAME.INVENTORY);
  });
});

describe("truncateOutboxError", () => {
  it("keeps short errors whole and cuts long ones to the stored limit", () => {
    expect(truncateOutboxError("boom")).toBe("boom");
    expect(truncateOutboxError("x".repeat(OUTBOX_LAST_ERROR_MAX_LENGTH * 2))).toHaveLength(
      OUTBOX_LAST_ERROR_MAX_LENGTH,
    );
  });
});

describe("toQueueConnectionOptions", () => {
  it("reads host, port and the logical database from the Redis URL", () => {
    expect(
      toQueueConnectionOptions("redis://localhost:6380/3", { maxRetriesPerRequest: null }),
    ).toMatchObject({ host: "localhost", port: 6380, db: 3, maxRetriesPerRequest: null });
  });

  it("falls back to the default port and database 0 when the URL leaves them out", () => {
    expect(
      toQueueConnectionOptions("redis://cache.internal", { maxRetriesPerRequest: null }),
    ).toMatchObject({ host: "cache.internal", port: 6379, db: 0 });
  });

  it("passes decoded credentials through and turns on TLS for rediss URLs", () => {
    const options = toQueueConnectionOptions("rediss://app:p%40ss@cache.example.com:6390/1", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    expect(options).toMatchObject({
      username: "app",
      password: "p@ss",
      tls: {},
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  });
});
