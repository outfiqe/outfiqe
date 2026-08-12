import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { creatorsApi } from "../api";
import type { CreatorStatusValue } from "../schemas";

export const useInfiniteCreators = (status: CreatorStatusValue) => {
  return useInfiniteCursorPage(["creators", status], (cursor) => creatorsApi.list(status, cursor));
};
