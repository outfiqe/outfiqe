import * as Sentry from "@sentry/node";
import { subMinutes } from "date-fns/subMinutes";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { runOutboxBacklogCheck } from "./platform-jobs.monitor.js";
import { platformJobsRepository } from "./platform-jobs.repository.js";

vi.mock("@sentry/node", () => ({ captureMessage: vi.fn() }));
vi.mock("./platform-jobs.repository.js", () => ({
  platformJobsRepository: {
    countUnpublished: vi.fn(),
    findOldestUnpublishedAt: vi.fn(),
    countStuck: vi.fn(),
  },
}));

const outboxLooksLike = ({
  waitingCount,
  oldestWaitMinutes,
  stuckCount,
}: {
  waitingCount: number;
  oldestWaitMinutes: number | null;
  stuckCount: number;
}) => {
  vi.mocked(platformJobsRepository.countUnpublished).mockResolvedValue(waitingCount);
  vi.mocked(platformJobsRepository.findOldestUnpublishedAt).mockResolvedValue(
    oldestWaitMinutes === null ? null : subMinutes(new Date(), oldestWaitMinutes),
  );
  vi.mocked(platformJobsRepository.countStuck).mockResolvedValue(stuckCount);
};

beforeEach(() => {
  vi.mocked(Sentry.captureMessage).mockReset();
});

describe("runOutboxBacklogCheck", () => {
  it("stays quiet while the outbox keeps up", async () => {
    outboxLooksLike({ waitingCount: 3, oldestWaitMinutes: 1, stuckCount: 0 });

    const report = await runOutboxBacklogCheck();

    expect(report.isFallingBehind).toBe(false);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("alerts when the oldest waiting event is too old", async () => {
    outboxLooksLike({ waitingCount: 3, oldestWaitMinutes: 12, stuckCount: 0 });

    const report = await runOutboxBacklogCheck();

    expect(report).toMatchObject({ isFallingBehind: true, oldestWaitMinutes: 12 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "The outbox is falling behind",
      expect.objectContaining({ level: "error" }),
    );
  });

  it("alerts when too many events are waiting, even if they are new", async () => {
    outboxLooksLike({ waitingCount: 5_000, oldestWaitMinutes: 0, stuckCount: 0 });

    expect((await runOutboxBacklogCheck()).isFallingBehind).toBe(true);
  });

  it("warns separately about events that gave up after every retry", async () => {
    outboxLooksLike({ waitingCount: 0, oldestWaitMinutes: null, stuckCount: 2 });

    const report = await runOutboxBacklogCheck();

    expect(report).toMatchObject({ isFallingBehind: false, oldestWaitMinutes: 0, stuckCount: 2 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Outbox events gave up after every retry",
      expect.objectContaining({ level: "warning" }),
    );
  });
});
