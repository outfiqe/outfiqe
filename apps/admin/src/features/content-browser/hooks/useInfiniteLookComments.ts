import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { contentBrowserApi } from "../api";

export const useInfiniteLookComments = (lookId: string, enabled: boolean) => {
  return useInfiniteCursorPage(
    ["content-browser", "comments", lookId],
    (cursor) => contentBrowserApi.listComments(lookId, cursor),
    enabled,
  );
};
