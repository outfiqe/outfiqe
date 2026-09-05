import { describe, expect, it, vi } from "vitest";

import { DEAD_LETTER_SUFFIX, STREAM_MAX_LEN } from "./event-bus.constants.js";
import {
  extractPayloadField,
  isMissingConsumerGroupError,
  parseEventPayload,
  publishToDeadLetter,
  serializeEventPayload,
} from "./event-bus.utils.js";

describe("serializeEventPayload / parseEventPayload", () => {
  it("round-trips a payload through JSON", () => {
    const payload = { userId: "user-1", followedId: "user-2" };
    expect(parseEventPayload(serializeEventPayload(payload))).toEqual(payload);
  });
});

describe("extractPayloadField", () => {
  it("returns the value following the 'payload' field name", () => {
    expect(extractPayloadField(["payload", "{}"])).toBe("{}");
    expect(extractPayloadField(["someField", "x", "payload", '{"a":1}'])).toBe('{"a":1}');
  });

  it("returns undefined when no 'payload' field is present", () => {
    expect(extractPayloadField(["someField", "x"])).toBeUndefined();
  });
});

describe("isMissingConsumerGroupError", () => {
  it("returns true for a Redis NOGROUP error", () => {
    const error = new Error(
      "NOGROUP No such key 'stream:user.followed' or consumer group 'xp-award'",
    );
    expect(isMissingConsumerGroupError(error)).toBe(true);
  });

  it("returns false for an unrelated error", () => {
    expect(isMissingConsumerGroupError(new Error("connection refused"))).toBe(false);
  });

  it("returns false for a non-Error value", () => {
    expect(isMissingConsumerGroupError("NOGROUP")).toBe(false);
  });
});

describe("publishToDeadLetter", () => {
  it("writes the original id and payload to the stream's dead-letter suffix", async () => {
    const redisClient = { xadd: vi.fn() };

    await publishToDeadLetter(
      redisClient as never,
      "stream:user.followed",
      "1234-0",
      '{"userId":"user-1"}',
    );

    expect(redisClient.xadd).toHaveBeenCalledWith(
      `stream:user.followed${DEAD_LETTER_SUFFIX}`,
      "MAXLEN",
      "~",
      STREAM_MAX_LEN,
      "*",
      "originalId",
      "1234-0",
      "payload",
      '{"userId":"user-1"}',
    );
  });
});
