import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineActionHandler } from "@/features/pwa";

const { registerOfflineActionHandler } = vi.hoisted(() => ({
  registerOfflineActionHandler: vi.fn(),
}));

vi.mock("@/features/pwa", () => ({ registerOfflineActionHandler }));

const { exploreFeedApi } = vi.hoisted(() => ({
  exploreFeedApi: {
    like: vi.fn().mockResolvedValue(undefined),
    unlike: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    unsave: vi.fn().mockResolvedValue(undefined),
    follow: vi.fn().mockResolvedValue(undefined),
    unfollow: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./api/exploreFeedApi", () => ({ exploreFeedApi }));

await import("./offlineActionHandlers");

const handlerFor = (actionType: string): OfflineActionHandler => {
  const call = registerOfflineActionHandler.mock.calls.find(([type]) => type === actionType);
  if (!call) throw new Error(`no handler registered for ${actionType}`);
  return call[1] as OfflineActionHandler;
};

beforeEach(() => {
  Object.values(exploreFeedApi).forEach((fn) => fn.mockClear());
});

describe("explore offline action handlers", () => {
  it("registers a handler for every queueable explore action", () => {
    expect(registerOfflineActionHandler).toHaveBeenCalledTimes(3);
  });

  it("replays a like", async () => {
    await handlerFor("like-look")({ lookId: "1", liked: false });
    expect(exploreFeedApi.like).toHaveBeenCalledWith("1");

    await handlerFor("like-look")({ lookId: "1", liked: true });
    expect(exploreFeedApi.unlike).toHaveBeenCalledWith("1");
  });

  it("replays a save", async () => {
    await handlerFor("save-look")({ lookId: "1", saved: false });
    expect(exploreFeedApi.save).toHaveBeenCalledWith("1");

    await handlerFor("save-look")({ lookId: "1", saved: true });
    expect(exploreFeedApi.unsave).toHaveBeenCalledWith("1");
  });

  it("replays a follow", async () => {
    await handlerFor("follow-creator")({ creatorId: "2", following: false });
    expect(exploreFeedApi.follow).toHaveBeenCalledWith("2");

    await handlerFor("follow-creator")({ creatorId: "2", following: true });
    expect(exploreFeedApi.unfollow).toHaveBeenCalledWith("2");
  });

  it("rejects a malformed payload instead of calling the api with garbage", async () => {
    await expect(handlerFor("like-look")({ lookId: 42 })).rejects.toThrow();
    expect(exploreFeedApi.like).not.toHaveBeenCalled();
  });
});
