import { beforeEach, describe, expect, it } from "vitest";

import { redis } from "#redis/redis.client.js";

import { publishToDeadLetter } from "./event-bus.utils.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("publishToDeadLetter", () => {
  it("writes the original id and payload onto the stream's dead-letter stream", async () => {
    const streamKey = "stream:user.followed";

    await publishToDeadLetter(redis, streamKey, "5-0", '{"a":1}');

    const entries = await redis.xrange(`${streamKey}:dead-letter`, "-", "+");
    expect(entries).toHaveLength(1);

    const [, fields] = entries[0];
    expect(fields).toEqual(["originalId", "5-0", "payload", '{"a":1}']);
  });
});
