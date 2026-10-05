import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { apiClient } from "@/lib/apiClient";

import {
  type AdminBuildAction,
  type AdminBuildDetail,
  adminBuildDetailSchema,
  type AdminBuildFilter,
  type AdminBuildHistoryPage,
  adminBuildHistoryPageSchema,
  type AdminBuildPage,
  adminBuildPageSchema,
  type BuildMetrics,
  buildMetricsSchema,
} from "./schemas";

export const ADMIN_BUILDS_QUERY_KEY = "admin-outfit-builds";
export const ADMIN_BUILD_QUERY_KEY = "admin-outfit-build";
export const ADMIN_BUILD_HISTORY_QUERY_KEY = "admin-outfit-build-history";
export const BUILD_METRICS_QUERY_KEY = "admin-outfit-build-metrics";

export const outfitBuildsApi = {
  async list(filter: AdminBuildFilter, cursor?: string): Promise<AdminBuildPage> {
    const res = await apiClient.get<AdminBuildPage>("/platform/builds", {
      params: { ...filter, cursor },
    });
    return adminBuildPageSchema.parse(res.data);
  },

  async get(outfitId: string): Promise<AdminBuildDetail> {
    const res = await apiClient.get<AdminBuildDetail>(`/platform/builds/${outfitId}`);
    return adminBuildDetailSchema.parse(res.data);
  },

  async history(outfitId: string, beforeVersion?: string): Promise<AdminBuildHistoryPage> {
    const res = await apiClient.get<AdminBuildHistoryPage>(`/platform/builds/${outfitId}/history`, {
      params: { beforeVersion },
    });
    return adminBuildHistoryPageSchema.parse(res.data);
  },

  async act(outfitId: string, action: AdminBuildAction, reason: string): Promise<void> {
    await apiClient.post(`/platform/builds/${outfitId}/${action}`, { reason });
  },

  async metrics(weeks: number): Promise<BuildMetrics> {
    const res = await apiClient.get<BuildMetrics>("/platform/builds/metrics", {
      params: { weeks },
    });
    return buildMetricsSchema.parse(res.data);
  },
};

export const useAdminBuilds = (filter: AdminBuildFilter) =>
  useInfiniteCursorPage(
    [ADMIN_BUILDS_QUERY_KEY, filter.search ?? "", filter.status ?? "", filter.visibility ?? ""],
    (cursor) => outfitBuildsApi.list(filter, cursor),
  );

export const useAdminBuildHistory = (outfitId: string) =>
  useInfiniteCursorPage([ADMIN_BUILD_HISTORY_QUERY_KEY, outfitId], async (cursor) => {
    const { events, nextBeforeVersion } = await outfitBuildsApi.history(outfitId, cursor);
    return {
      items: events,
      nextCursor: nextBeforeVersion === null ? null : String(nextBeforeVersion),
    };
  });
