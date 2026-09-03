import { startOfDay } from "date-fns/startOfDay";

import { AppError } from "#middlewares/error-handler.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";

import { DEFAULT_TENANTS_PAGE_SIZE, SPARKLINE_DAYS } from "./platform-metrics.constants.js";
import { platformMetricsRepository } from "./platform-metrics.repository.js";
import type {
  PlatformActivityTrendPoint,
  PlatformOverview,
  TenantMetricDetail,
  TenantMetricListFilters,
  TenantMetricListPage,
} from "./platform-metrics.types.js";

const NOT_FOUND_STATUS = 404;
const RELATIONSHIP_COUNT_QUERY = { query: "", page: 1, pageSize: 1 } as const;

const countTenantRelationships = async (organization: {
  id: string;
  linkedBrandId: string | null;
}): Promise<{ partnerCount: number; customerCount: number }> => {
  if (!organization.linkedBrandId) return { partnerCount: 0, customerCount: 0 };
  const [partners, customers] = await Promise.all([
    crmRelationshipsService.listPartners(organization, RELATIONSHIP_COUNT_QUERY),
    crmRelationshipsService.listCustomers(organization, RELATIONSHIP_COUNT_QUERY),
  ]);
  return { partnerCount: partners.total, customerCount: customers.total };
};

export const platformMetricsService = {
  listTenants(query: {
    plan?: string;
    sort?: TenantMetricListFilters["sort"];
    page?: number;
    pageSize?: number;
  }): Promise<TenantMetricListPage> {
    return platformMetricsRepository.listTenants({
      plan: query.plan,
      sort: query.sort,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? DEFAULT_TENANTS_PAGE_SIZE,
    });
  },

  overview(): Promise<PlatformOverview> {
    return platformMetricsRepository.overview();
  },

  activityTrend(): Promise<PlatformActivityTrendPoint[]> {
    return platformMetricsRepository.platformActivityTrend(SPARKLINE_DAYS);
  },

  async tenantDetail(organizationId: string): Promise<TenantMetricDetail> {
    const row = await platformMetricsRepository.findTenant(organizationId);
    if (!row) throw new AppError("TENANT_NOT_FOUND", "Tenant not found.", NOT_FOUND_STATUS);

    const [relationships, series] = await Promise.all([
      countTenantRelationships({ id: row.organizationId, linkedBrandId: row.linkedBrandId }),
      platformMetricsRepository.sparkline(organizationId, SPARKLINE_DAYS),
    ]);

    return { ...row, ...relationships, series };
  },

  async runDailySnapshot(): Promise<number> {
    const day = startOfDay(new Date());
    const [organizations, activeMemberCounts] = await Promise.all([
      platformMetricsRepository.listOrganizationSnapshotInputs(),
      platformMetricsRepository.activeMemberCountsByOrg(),
    ]);

    for (const organization of organizations) {
      await platformMetricsRepository.upsertRollup(organization.id, day, {
        contactCount: organization.contactCount,
        dealCount: organization.dealCount,
        ticketCount: organization.ticketCount,
        activityCount: organization.activityCount,
        activeMemberCount: activeMemberCounts.get(organization.id) ?? 0,
      });
    }

    return organizations.length;
  },
};
