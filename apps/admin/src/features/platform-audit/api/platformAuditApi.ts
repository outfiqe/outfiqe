import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/apiClient";

import {
  type PlatformAuditFilter,
  type PlatformAuditFilterOptions,
  platformAuditFilterOptionsSchema,
  type PlatformAuditPage,
  platformAuditPageSchema,
} from "./platformAuditSchemas";

export const PLATFORM_AUDIT_QUERY_KEY = "platform-audit-log";
const PLATFORM_AUDIT_FILTER_OPTIONS_QUERY_KEY = "platform-audit-filter-options";

export const platformAuditApi = {
  async filterOptions(): Promise<PlatformAuditFilterOptions> {
    const res = await apiClient.get<PlatformAuditFilterOptions>("/platform/audit/filters");
    return platformAuditFilterOptionsSchema.parse(res.data);
  },

  async list(filter: PlatformAuditFilter, cursor?: string) {
    const res = await apiClient.get<PlatformAuditPage>("/platform/audit", {
      params: { ...filter, cursor },
    });
    const { entries, nextCursor } = platformAuditPageSchema.parse(res.data);
    return { items: entries, nextCursor };
  },
};

export const usePlatformAuditFilterOptions = () =>
  useQuery({
    queryKey: [PLATFORM_AUDIT_FILTER_OPTIONS_QUERY_KEY],
    queryFn: platformAuditApi.filterOptions,
  });

export const usePlatformAuditLog = (filter: PlatformAuditFilter) =>
  useInfiniteCursorPage([PLATFORM_AUDIT_QUERY_KEY, filter], (cursor) =>
    platformAuditApi.list(filter, cursor),
  );
