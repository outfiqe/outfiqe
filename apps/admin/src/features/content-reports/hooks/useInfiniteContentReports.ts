import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { contentReportsApi } from "../api";
import type { ContentReportStatusValue } from "../schemas";

export const useInfiniteContentReports = (status: ContentReportStatusValue) => {
  return useInfiniteCursorPage(["content-reports", status], (cursor) =>
    contentReportsApi.list(status, cursor),
  );
};
