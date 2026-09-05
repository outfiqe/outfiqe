import { onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueOfflineAction } from "@/features/pwa";

import { toggleWithOfflineQueue } from "./offlineQueueableToggle";

vi.mock("@/features/pwa", () => ({
  enqueueOfflineAction: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(enqueueOfflineAction).mockClear();
});

describe("toggleWithOfflineQueue", () => {
  it("performs the real toggle when there is a connection", async () => {
    const performToggle = vi.fn().mockResolvedValue({ liked: true, likeCount: 3 });

    const result = await toggleWithOfflineQueue(
      "like-look",
      "like-look:1",
      { lookId: "1" },
      performToggle,
    );

    expect(performToggle).toHaveBeenCalledTimes(1);
    expect(enqueueOfflineAction).not.toHaveBeenCalled();
    expect(result).toEqual({ liked: true, likeCount: 3 });
  });

  it("queues the action and skips the real call while offline", async () => {
    onlineManager.setOnline(false);
    const performToggle = vi.fn().mockResolvedValue({ liked: true, likeCount: 3 });

    const result = await toggleWithOfflineQueue(
      "like-look",
      "like-look:1",
      { lookId: "1", liked: false },
      performToggle,
    );

    expect(performToggle).not.toHaveBeenCalled();
    expect(enqueueOfflineAction).toHaveBeenCalledWith("like-look", "like-look:1", {
      lookId: "1",
      liked: false,
    });
    expect(result).toBeNull();
  });
});
