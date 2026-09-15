import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { contentBrowserApi } from "../api";

export const useInfiniteAdminLooks = (q: string) => {
  return useInfiniteCursorPage(["content-browser", "looks", q], (cursor) =>
    contentBrowserApi.listLooks(q, cursor),
  );
};
