import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_QUEUED_OFFLINE_ACTIONS } from "../constants/offlineActions";
import type { QueuedOfflineAction } from "./offlineActionQueue";

const { del, get, set } = vi.hoisted(() => ({
  del: vi.fn(() => Promise.resolve()),
  get: vi.fn((): Promise<QueuedOfflineAction[] | undefined> => Promise.resolve(undefined)),
  set: vi.fn((_key: string, _value: QueuedOfflineAction[]) => Promise.resolve()),
}));

vi.mock("idb-keyval", () => ({ del, get, set }));

const lastSavedQueue = (): QueuedOfflineAction[] => {
  const lastCall = set.mock.calls.at(-1);
  if (!lastCall) throw new Error("set was never called");
  return lastCall[1];
};

const { enqueueOfflineAction, listQueuedOfflineActions, removeQueuedOfflineAction } =
  await import("./offlineActionQueue");

beforeEach(() => {
  del.mockClear().mockResolvedValue(undefined);
  get.mockClear().mockResolvedValue(undefined);
  set.mockClear().mockResolvedValue(undefined);
  vi.stubGlobal("indexedDB", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("enqueueOfflineAction", () => {
  it("stores a queued action keyed for later replay", async () => {
    await enqueueOfflineAction("like-look", "like-look:1", { lookId: "1", liked: false });

    const savedQueue = lastSavedQueue();
    expect(savedQueue).toHaveLength(1);
    expect(savedQueue[0]).toMatchObject({
      type: "like-look",
      key: "like-look:1",
      payload: { lookId: "1", liked: false },
    });
  });

  it("collapses a repeated action on the same thing into the latest one", async () => {
    get.mockResolvedValue([
      { key: "like-look:1", type: "like-look", payload: { liked: false }, queuedAt: 1 },
    ]);

    await enqueueOfflineAction("like-look", "like-look:1", { liked: true });

    const savedQueue = lastSavedQueue();
    expect(savedQueue).toHaveLength(1);
    expect(savedQueue[0]?.payload).toEqual({ liked: true });
  });

  it("drops the oldest entries once the cap is reached", async () => {
    const existingQueue: QueuedOfflineAction[] = Array.from(
      { length: MAX_QUEUED_OFFLINE_ACTIONS },
      (_, index) => ({
        key: `like-look:${index}`,
        type: "like-look",
        payload: { lookId: String(index) },
        queuedAt: index,
      }),
    );
    get.mockResolvedValue(existingQueue);

    await enqueueOfflineAction("like-look", "like-look:new", { lookId: "new" });

    const savedQueue = lastSavedQueue();
    expect(savedQueue).toHaveLength(MAX_QUEUED_OFFLINE_ACTIONS);
    expect(savedQueue.find((action) => action.key === "like-look:0")).toBeUndefined();
    expect(savedQueue.find((action) => action.key === "like-look:new")).toBeDefined();
  });

  it("never throws when the browser has no database at all", async () => {
    vi.unstubAllGlobals();

    await expect(
      enqueueOfflineAction("like-look", "like-look:1", { lookId: "1" }),
    ).resolves.toBeUndefined();
    expect(set).not.toHaveBeenCalled();
  });
});

describe("listQueuedOfflineActions", () => {
  it("returns an empty queue when nothing has been saved", async () => {
    await expect(listQueuedOfflineActions()).resolves.toEqual([]);
  });

  it("returns whatever was saved", async () => {
    const queue: QueuedOfflineAction[] = [
      { key: "follow-creator:1", type: "follow-creator", payload: {}, queuedAt: 1 },
    ];
    get.mockResolvedValue(queue);

    await expect(listQueuedOfflineActions()).resolves.toEqual(queue);
  });
});

describe("removeQueuedOfflineAction", () => {
  it("removes only the matching entry", async () => {
    get.mockResolvedValue([
      { key: "like-look:1", type: "like-look", payload: {}, queuedAt: 1 },
      { key: "like-look:2", type: "like-look", payload: {}, queuedAt: 2 },
    ]);

    await removeQueuedOfflineAction("like-look:1");

    const savedQueue = lastSavedQueue();
    expect(savedQueue.map((action) => action.key)).toEqual(["like-look:2"]);
  });
});
