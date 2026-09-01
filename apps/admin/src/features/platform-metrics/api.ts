import { apiClient } from "@/lib/apiClient";

import {
  type PlatformOverview,
  platformOverviewSchema,
  type TenantMetricDetail,
  tenantMetricDetailSchema,
  type TenantMetricListPage,
  tenantMetricListPageSchema,
  type TenantSort,
} from "./schemas";

type ListParams = { plan?: string; sort?: TenantSort; page?: number; pageSize?: number };

export const platformMetricsApi = {
  async getOverview(): Promise<PlatformOverview> {
    const res = await apiClient.get<PlatformOverview>("/platform/metrics/overview");
    return platformOverviewSchema.parse(res.data);
  },

  async listTenants(params: ListParams = {}): Promise<TenantMetricListPage> {
    const res = await apiClient.get<TenantMetricListPage>("/platform/metrics/tenants", {
      params: {
        ...(params.plan ? { plan: params.plan } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
        ...(params.page ? { page: params.page } : {}),
        ...(params.pageSize ? { pageSize: params.pageSize } : {}),
      },
    });
    return tenantMetricListPageSchema.parse(res.data);
  },

  async getTenantDetail(orgId: string): Promise<TenantMetricDetail> {
    const res = await apiClient.get<TenantMetricDetail>(`/platform/metrics/tenants/${orgId}`);
    return tenantMetricDetailSchema.parse(res.data);
  },
};
