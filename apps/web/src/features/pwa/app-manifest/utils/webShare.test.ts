import { afterEach, describe, expect, it, vi } from "vitest";

import { shareOrCopyLink } from "./webShare";

const payload = { title: "A look on Outfiqe", url: "https://outfiqe.com/creator/ram?look=1" };

const stubClipboardWriteText = (writeText: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return writeText;
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
});

describe("shareOrCopyLink", () => {
  it("uses the native share sheet when the browser has one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    const outcome = await shareOrCopyLink(payload);

    expect(share).toHaveBeenCalledWith(payload);
    expect(outcome).toBe("shared");
  });

  it("treats the user closing the share sheet as a quiet no-op, not a failure", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const writeText = stubClipboardWriteText(vi.fn().mockResolvedValue(undefined));

    const outcome = await shareOrCopyLink(payload);

    expect(outcome).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when the browser has no share sheet at all", async () => {
    const writeText = stubClipboardWriteText(vi.fn().mockResolvedValue(undefined));

    const outcome = await shareOrCopyLink(payload);

    expect(writeText).toHaveBeenCalledWith(payload.url);
    expect(outcome).toBe("copied");
  });

  it("falls back to copying when a real share attempt fails for some other reason", async () => {
    const share = vi.fn().mockRejectedValue(new Error("share target crashed"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const writeText = stubClipboardWriteText(vi.fn().mockResolvedValue(undefined));

    const outcome = await shareOrCopyLink(payload);

    expect(writeText).toHaveBeenCalledWith(payload.url);
    expect(outcome).toBe("copied");
  });

  it("reports failure when even the clipboard is unavailable", async () => {
    stubClipboardWriteText(vi.fn().mockRejectedValue(new Error("no permission")));

    const outcome = await shareOrCopyLink(payload);

    expect(outcome).toBe("failed");
  });
});
