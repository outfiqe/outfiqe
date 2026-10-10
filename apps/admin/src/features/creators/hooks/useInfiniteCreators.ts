import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { creatorsApi } from "../api/creatorsApi";
import type { CreatorStatusValue } from "../api/creatorsSchemas";

export const useInfiniteCreators = (status: CreatorStatusValue) => {
  return useInfiniteCursorPage(["creators", status], (cursor) => creatorsApi.list(status, cursor));
};
