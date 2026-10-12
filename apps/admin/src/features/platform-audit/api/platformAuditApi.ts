import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { apiClient } from "@/lib/apiClient";

import {
  type PlatformAuditFilter,
  type PlatformAuditPage,
  platformAuditPageSchema,
} from "./platformAuditSchemas";

export const PLATFORM_AUDIT_QUERY_KEY = "platform-audit-log";

export const platformAuditApi = {
  async list(filter: PlatformAuditFilter, cursor?: string) {
    const res = await apiClient.get<PlatformAuditPage>("/platform/audit", {
      params: { ...filter, cursor },
    });
    const { entries, nextCursor } = platformAuditPageSchema.parse(res.data);
    return { items: entries, nextCursor };
  },
};

export const usePlatformAuditLog = (filter: PlatformAuditFilter) =>
  useInfiniteCursorPage(
    [PLATFORM_AUDIT_QUERY_KEY, filter.action ?? "", filter.targetType ?? "", filter.targetId ?? ""],
    (cursor) => platformAuditApi.list(filter, cursor),
  );
