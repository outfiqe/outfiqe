import { describe, expect, it } from "vitest";

import {
  extractPayloadField,
  isMissingConsumerGroupError,
  parseEventPayload,
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
