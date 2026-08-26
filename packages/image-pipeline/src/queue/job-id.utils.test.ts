import { describe, expect, it } from "vitest";

import { buildIdempotentJobId } from "./job-id.utils.js";

describe("buildIdempotentJobId", () => {
  it("is deterministic for the same checksum, stage, and params", () => {
    const first = buildIdempotentJobId({
      checksum: "abc123",
      stage: "resize",
      transformParams: { width: 640 },
    });
    const second = buildIdempotentJobId({
      checksum: "abc123",
      stage: "resize",
      transformParams: { width: 640 },
    });
    expect(first).toBe(second);
  });

  it("is order-independent across transformParams keys", () => {
    const first = buildIdempotentJobId({
      checksum: "abc123",
      stage: "optimize",
      transformParams: { width: 640, quality: 80 },
    });
    const second = buildIdempotentJobId({
      checksum: "abc123",
      stage: "optimize",
      transformParams: { quality: 80, width: 640 },
    });
    expect(first).toBe(second);
  });

  it("differs when the checksum differs", () => {
    const first = buildIdempotentJobId({ checksum: "abc123", stage: "ingest" });
    const second = buildIdempotentJobId({ checksum: "xyz789", stage: "ingest" });
    expect(first).not.toBe(second);
  });

  it("differs when the stage differs", () => {
    const first = buildIdempotentJobId({ checksum: "abc123", stage: "ingest" });
    const second = buildIdempotentJobId({ checksum: "abc123", stage: "resize" });
    expect(first).not.toBe(second);
  });

  it("differs when transform params differ", () => {
    const first = buildIdempotentJobId({
      checksum: "abc123",
      stage: "resize",
      transformParams: { width: 640 },
    });
    const second = buildIdempotentJobId({
      checksum: "abc123",
      stage: "resize",
      transformParams: { width: 1080 },
    });
    expect(first).not.toBe(second);
  });

  it("prefixes the id with the stage name for readability", () => {
    const jobId = buildIdempotentJobId({ checksum: "abc123", stage: "thumbnail" });
    expect(jobId.startsWith("thumbnail-")).toBe(true);
  });

  it("never contains a colon (BullMQ rejects custom job ids containing ':')", () => {
    const jobId = buildIdempotentJobId({ checksum: "abc123", stage: "resize" });
    expect(jobId).not.toContain(":");
  });
});
