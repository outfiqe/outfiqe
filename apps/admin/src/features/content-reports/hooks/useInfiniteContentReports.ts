import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { contentReportsApi } from "../api/contentReportsApi";
import type { ContentReportStatusValue } from "../api/contentReportsSchemas";

export const useInfiniteContentReports = (status: ContentReportStatusValue) => {
  return useInfiniteCursorPage(["content-reports", status], (cursor) =>
    contentReportsApi.list(status, cursor),
  );
};
