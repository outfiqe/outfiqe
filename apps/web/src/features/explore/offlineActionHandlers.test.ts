import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineActionHandler } from "@/features/pwa";

const { registerOfflineActionHandler } = vi.hoisted(() => ({
  registerOfflineActionHandler: vi.fn(),
}));

vi.mock("@/features/pwa", () => ({ registerOfflineActionHandler }));

const { exploreFeedApi } = vi.hoisted(() => ({
  exploreFeedApi: {
    like: vi.fn(),
    unlike: vi.fn(),
    save: vi.fn(),
    unsave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}));

vi.mock("./api/exploreFeedApi", () => ({ exploreFeedApi }));

const { patchPostInFeedCaches, patchCreatorInFeedCaches } = vi.hoisted(() => ({
  patchPostInFeedCaches: vi.fn(),
  patchCreatorInFeedCaches: vi.fn(),
}));

vi.mock("./utils/feedCacheUpdate", () => ({ patchPostInFeedCaches, patchCreatorInFeedCaches }));

await import("./offlineActionHandlers");

const queryClient = {} as QueryClient;

const handlerFor = (actionType: string): OfflineActionHandler => {
  const call = registerOfflineActionHandler.mock.calls.find(([type]) => type === actionType);
  if (!call) throw new Error(`no handler registered for ${actionType}`);
  return call[1] as OfflineActionHandler;
};

beforeEach(() => {
  Object.values(exploreFeedApi).forEach((fn) => fn.mockReset());
  patchPostInFeedCaches.mockReset();
  patchCreatorInFeedCaches.mockReset();
});

describe("explore offline action handlers", () => {
  it("registers a handler for every queueable explore action", () => {
    expect(registerOfflineActionHandler).toHaveBeenCalledTimes(3);
  });

  it("replays a like and reconciles the feed caches with the server's response", async () => {
    exploreFeedApi.like.mockResolvedValue({ liked: true, likeCount: 5 });
    await handlerFor("like-look")({ lookId: "1", liked: false }, queryClient);
    expect(exploreFeedApi.like).toHaveBeenCalledWith("1");
    expect(patchPostInFeedCaches).toHaveBeenCalledWith(queryClient, "1", expect.any(Function));
    const [, , patch] = patchPostInFeedCaches.mock.calls[0] as [
      unknown,
      unknown,
      (post: unknown) => unknown,
    ];
    expect(patch({ isLiked: false, likeCount: 4 })).toEqual({ isLiked: true, likeCount: 5 });

    exploreFeedApi.unlike.mockResolvedValue({ liked: false, likeCount: 4 });
    await handlerFor("like-look")({ lookId: "1", liked: true }, queryClient);
    expect(exploreFeedApi.unlike).toHaveBeenCalledWith("1");
  });

  it("replays a save and reconciles the feed caches with the server's response", async () => {
    exploreFeedApi.save.mockResolvedValue({ saved: true, saveCount: 3 });
    await handlerFor("save-look")({ lookId: "1", saved: false }, queryClient);
    expect(exploreFeedApi.save).toHaveBeenCalledWith("1");
    const [, , patch] = patchPostInFeedCaches.mock.calls[0] as [
      unknown,
      unknown,
      (post: unknown) => unknown,
    ];
    expect(patch({ isSaved: false, saveCount: 2 })).toEqual({ isSaved: true, saveCount: 3 });

    exploreFeedApi.unsave.mockResolvedValue({ saved: false, saveCount: 2 });
    await handlerFor("save-look")({ lookId: "1", saved: true }, queryClient);
    expect(exploreFeedApi.unsave).toHaveBeenCalledWith("1");
  });

  it("replays a follow and reconciles the feed caches with the server's response", async () => {
    exploreFeedApi.follow.mockResolvedValue({ following: true, followerCount: 10 });
    await handlerFor("follow-creator")({ creatorId: "2", following: false }, queryClient);
    expect(exploreFeedApi.follow).toHaveBeenCalledWith("2");
    expect(patchCreatorInFeedCaches).toHaveBeenCalledWith(queryClient, "2", true);

    exploreFeedApi.unfollow.mockResolvedValue({ following: false, followerCount: 9 });
    await handlerFor("follow-creator")({ creatorId: "2", following: true }, queryClient);
    expect(exploreFeedApi.unfollow).toHaveBeenCalledWith("2");
    expect(patchCreatorInFeedCaches).toHaveBeenCalledWith(queryClient, "2", false);
  });

  it("rejects a malformed payload instead of calling the api with garbage", async () => {
    await expect(handlerFor("like-look")({ lookId: 42 }, queryClient)).rejects.toThrow();
    expect(exploreFeedApi.like).not.toHaveBeenCalled();
  });
});
