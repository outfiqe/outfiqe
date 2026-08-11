import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";

import { brandApplicationsApi } from "../api";
import type { BrandApplicationStatusValue } from "../schemas";

export const useInfiniteBrandApplications = (status: BrandApplicationStatusValue) => {
  return useInfiniteCursorPage(["brand-applications", status], (cursor) =>
    brandApplicationsApi.list(status, cursor),
  );
};
