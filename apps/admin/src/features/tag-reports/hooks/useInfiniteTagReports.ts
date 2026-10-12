import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { tagReportsApi } from "../api/tagReportsApi";
import type { TagReportStatusValue } from "../api/tagReportsSchemas";

export const useInfiniteTagReports = (status: TagReportStatusValue) => {
  return useInfiniteCursorPage(["tag-reports", status], (cursor) =>
    tagReportsApi.list(status, cursor),
  );
};
