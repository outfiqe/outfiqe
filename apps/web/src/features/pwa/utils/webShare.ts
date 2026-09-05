export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type SharePayload = {
  title: string;
  text?: string;
  url: string;
};

const isShareAvailable = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

const isUserCancelledShare = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export const shareOrCopyLink = async (payload: SharePayload): Promise<ShareOutcome> => {
  if (isShareAvailable()) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (error) {
      if (isUserCancelledShare(error)) return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(payload.url);
    return "copied";
  } catch {
    return "failed";
  }
};
