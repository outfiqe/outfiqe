import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { usersApi } from "../api/usersApi";

export const useInfiniteUsers = (q: string) => {
  return useInfiniteCursorPage(["users", q], (cursor) => usersApi.list(q || undefined, cursor));
};
