import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { contentBrowserApi } from "../api";

export const useInfiniteLookReplies = (lookId: string, commentId: string, enabled: boolean) => {
  return useInfiniteCursorPage(
    ["content-browser", "replies", lookId, commentId],
    (cursor) => contentBrowserApi.listReplies(lookId, commentId, cursor),
    enabled,
  );
};
