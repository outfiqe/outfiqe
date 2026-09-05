import { describe, expect, it, vi } from "vitest";

vi.mock("./clearCachedContent", () => ({
  clearCachedContent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./queryPersister", () => ({
  clearPersistedQueries: vi.fn().mockResolvedValue(undefined),
}));

describe("clearAllOfflineData", () => {
  it("clears the cached pages/photos and the persisted query cache together", async () => {
    const { clearCachedContent } = await import("./clearCachedContent");
    const { clearPersistedQueries } = await import("./queryPersister");
    const { clearAllOfflineData } = await import("./clearOfflineData");

    await clearAllOfflineData();

    expect(clearCachedContent).toHaveBeenCalledTimes(1);
    expect(clearPersistedQueries).toHaveBeenCalledTimes(1);
  });
});
