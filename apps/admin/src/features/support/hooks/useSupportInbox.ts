import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { supportApi } from "../api/supportApi";
import type { SupportInboxFilters } from "../api/supportSchemas";
import { INBOX_KEY } from "../constants/supportQueryKeys";

export const useSupportInbox = (filters: SupportInboxFilters) =>
  useInfiniteCursorPage([INBOX_KEY, filters], (cursor) => supportApi.list(filters, cursor));
