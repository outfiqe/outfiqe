import { describe, expect, it } from "vitest";

import { createQueueRedisConnectionOptions } from "./redis-connection.js";

describe("createQueueRedisConnectionOptions", () => {
  it("builds ConnectionOptions from the pipeline config with maxRetriesPerRequest disabled", () => {
    const options = createQueueRedisConnectionOptions();

    expect(options).toMatchObject({
      host: "localhost",
      port: 6379,
      db: 0,
      maxRetriesPerRequest: null,
    });
  });

  it("omits tls options when TLS is disabled (the local Docker Redis default)", () => {
    const options = createQueueRedisConnectionOptions();
    expect(options.tls).toBeUndefined();
  });
});
