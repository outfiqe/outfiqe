export type IncomingPushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

const FALLBACK_PUSH_MESSAGE: IncomingPushMessage = {
  title: "Outfiqe",
  body: "You have a new notification",
  url: "/notifications",
  tag: "outfiqe-notification",
};

export const parsePushMessage = (raw: string | undefined): IncomingPushMessage => {
  if (!raw) return FALLBACK_PUSH_MESSAGE;

  try {
    const parsed = JSON.parse(raw) as Partial<IncomingPushMessage>;
    return {
      title: parsed.title ?? FALLBACK_PUSH_MESSAGE.title,
      body: parsed.body ?? FALLBACK_PUSH_MESSAGE.body,
      url: parsed.url ?? FALLBACK_PUSH_MESSAGE.url,
      tag: parsed.tag ?? FALLBACK_PUSH_MESSAGE.tag,
    };
  } catch {
    return FALLBACK_PUSH_MESSAGE;
  }
};
