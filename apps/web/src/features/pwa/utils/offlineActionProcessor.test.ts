import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QueuedOfflineAction } from "./offlineActionQueue";

const { listQueuedOfflineActions, removeQueuedOfflineAction } = vi.hoisted(() => ({
  listQueuedOfflineActions: vi.fn((): Promise<QueuedOfflineAction[]> => Promise.resolve([])),
  removeQueuedOfflineAction: vi.fn(() => Promise.resolve()),
}));

vi.mock("./offlineActionQueue", () => ({ listQueuedOfflineActions, removeQueuedOfflineAction }));

const { drainQueuedOfflineActions, registerOfflineActionHandler } =
  await import("./offlineActionProcessor");

beforeEach(() => {
  listQueuedOfflineActions.mockReset().mockResolvedValue([]);
  removeQueuedOfflineAction.mockReset().mockResolvedValue(undefined);
});

describe("drainQueuedOfflineActions", () => {
  it("replays a queued action through its registered handler and removes it once it succeeds", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    registerOfflineActionHandler("like-look", handler);
    listQueuedOfflineActions.mockResolvedValue([
      { key: "like-look:1", type: "like-look", payload: { lookId: "1" }, queuedAt: 1 },
    ]);

    await drainQueuedOfflineActions();

    expect(handler).toHaveBeenCalledWith({ lookId: "1" });
    expect(removeQueuedOfflineAction).toHaveBeenCalledWith("like-look:1");
  });

  it("leaves a queued action in place when its handler fails, instead of losing it", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("still offline"));
    registerOfflineActionHandler("follow-creator", handler);
    listQueuedOfflineActions.mockResolvedValue([
      { key: "follow-creator:1", type: "follow-creator", payload: {}, queuedAt: 1 },
    ]);

    await drainQueuedOfflineActions();

    expect(removeQueuedOfflineAction).not.toHaveBeenCalled();
  });

  it("skips an action with no registered handler, rather than throwing", async () => {
    listQueuedOfflineActions.mockResolvedValue([
      { key: "unknown-type:1", type: "unknown-type", payload: {}, queuedAt: 1 },
    ]);

    await expect(drainQueuedOfflineActions()).resolves.toBeUndefined();
    expect(removeQueuedOfflineAction).not.toHaveBeenCalled();
  });

  it("keeps processing the rest of the queue after one entry fails", async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error("still offline"));
    const succeedingHandler = vi.fn().mockResolvedValue(undefined);
    registerOfflineActionHandler("like-look", failingHandler);
    registerOfflineActionHandler("follow-creator", succeedingHandler);
    listQueuedOfflineActions.mockResolvedValue([
      { key: "like-look:1", type: "like-look", payload: {}, queuedAt: 1 },
      { key: "follow-creator:1", type: "follow-creator", payload: {}, queuedAt: 2 },
    ]);

    await drainQueuedOfflineActions();

    expect(succeedingHandler).toHaveBeenCalledTimes(1);
    expect(removeQueuedOfflineAction).toHaveBeenCalledWith("follow-creator:1");
    expect(removeQueuedOfflineAction).not.toHaveBeenCalledWith("like-look:1");
  });

  it("does not start a second drain while one is already running", async () => {
    let resolveFirstHandler: () => void = () => {};
    const slowHandler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstHandler = resolve;
        }),
    );
    registerOfflineActionHandler("like-look", slowHandler);
    listQueuedOfflineActions.mockResolvedValue([
      { key: "like-look:1", type: "like-look", payload: {}, queuedAt: 1 },
    ]);

    const firstDrain = drainQueuedOfflineActions();
    const secondDrain = drainQueuedOfflineActions();
    await vi.waitFor(() => expect(slowHandler).toHaveBeenCalledTimes(1));
    resolveFirstHandler();
    await Promise.all([firstDrain, secondDrain]);

    expect(listQueuedOfflineActions).toHaveBeenCalledTimes(1);
  });
});
