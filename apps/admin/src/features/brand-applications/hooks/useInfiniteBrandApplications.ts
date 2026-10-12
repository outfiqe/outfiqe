import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { brandApplicationsApi } from "../api/brandApplicationsApi";
import type { BrandApplicationStatusValue } from "../api/brandApplicationsSchemas";

export const useInfiniteBrandApplications = (status: BrandApplicationStatusValue) => {
  return useInfiniteCursorPage(["brand-applications", status], (cursor) =>
    brandApplicationsApi.list(status, cursor),
  );
};
