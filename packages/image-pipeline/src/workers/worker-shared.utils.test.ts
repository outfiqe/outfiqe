import { describe, expect, it, vi } from "vitest";

import { buildWorkerOptions, withStageLogging } from "./worker-shared.utils.js";

describe("buildWorkerOptions", () => {
  it("wires the given connection and concurrency into WorkerOptions", () => {
    const connection = { host: "localhost", port: 6379 };
    const options = buildWorkerOptions(connection, 7);

    expect(options.connection).toBe(connection);
    expect(options.concurrency).toBe(7);
    expect(options.limiter).toBeDefined();
  });
});

describe("withStageLogging", () => {
  it("logs an info entry with duration on success", async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const wrapped = withStageLogging("resize", logger, async () => "ok" as const);

    const result = await wrapped({ id: "job-1", attemptsMade: 1, data: {} });

    expect(result).toBe("ok");
    expect(logger.info).toHaveBeenCalledWith(
      "image-pipeline: resize stage completed",
      expect.objectContaining({ stage: "resize", jobId: "job-1" }),
    );
  });

  it("logs an error entry and rethrows on failure", async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const wrapped = withStageLogging("optimize", logger, async () => {
      throw new Error("boom");
    });

    await expect(wrapped({ id: "job-2", attemptsMade: 2, data: {} })).rejects.toThrow("boom");
    expect(logger.error).toHaveBeenCalledWith(
      "image-pipeline: optimize stage failed",
      expect.objectContaining({ stage: "optimize", jobId: "job-2", error: "boom" }),
    );
  });
});
