import { afterEach, describe, expect, it, vi } from "vitest";

import { SHARED_PHOTO_CACHE_NAME, SHARED_PHOTO_CACHE_URL } from "../constants/shareTarget";
import { readSharedPhoto } from "./shareTargetPhoto";

const stubCaches = (cache: {
  match: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}) => {
  vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(cache) });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readSharedPhoto", () => {
  it("returns null when nothing was shared", async () => {
    stubCaches({ match: vi.fn().mockResolvedValue(undefined), delete: vi.fn() });

    await expect(readSharedPhoto()).resolves.toBeNull();
  });

  it("returns the shared photo as a File and clears it from the cache", async () => {
    const blob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const deleteEntry = vi.fn().mockResolvedValue(true);
    const cachedResponse = new Response(blob, { headers: { "Content-Type": blob.type } });
    stubCaches({ match: vi.fn().mockResolvedValue(cachedResponse), delete: deleteEntry });

    const photo = await readSharedPhoto();

    expect(photo).toBeInstanceOf(File);
    expect(photo?.type).toBe("image/jpeg");
    expect(deleteEntry).toHaveBeenCalledWith(SHARED_PHOTO_CACHE_URL);
  });

  it("never throws when there is no cache storage at all", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("caches", undefined);

    await expect(readSharedPhoto()).resolves.toBeNull();
  });

  it("opens the dedicated shared-photo cache", async () => {
    const open = vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined) });
    vi.stubGlobal("caches", { open });

    await readSharedPhoto();

    expect(open).toHaveBeenCalledWith(SHARED_PHOTO_CACHE_NAME);
  });
});
