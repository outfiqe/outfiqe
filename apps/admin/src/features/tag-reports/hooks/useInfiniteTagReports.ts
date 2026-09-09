import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { tagReportsApi } from "../api";
import type { TagReportStatusValue } from "../schemas";

export const useInfiniteTagReports = (status: TagReportStatusValue) => {
  return useInfiniteCursorPage(["tag-reports", status], (cursor) =>
    tagReportsApi.list(status, cursor),
  );
};
