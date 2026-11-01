import { subDays } from "date-fns/subDays";

import logger from "#lib/winston.utils.js";
import type { OrganizationRecord } from "#modules/crm-access/crm-access.types.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";
import { describeError } from "#redis/redis.utils.js";

import { crmConnectionsService } from "./connections/connections.service.js";
import {
  CRM_SEARCH_ENTITY,
  CRM_SEARCH_ENTITY_PERMISSION,
  SEARCH_RESULTS_PER_TYPE,
  STUCK_DEAL_DAYS,
} from "./crm-reporting.constants.js";
import { crmReportingRepository } from "./crm-reporting.repository.js";
import type {
  CrmAttentionReport,
  CrmOverviewReport,
  CrmSearchResults,
  PipelineReport,
  TicketReport,
} from "./crm-reporting.types.js";

type SearchEntity = (typeof CRM_SEARCH_ENTITY)[keyof typeof CRM_SEARCH_ENTITY];

type SearchViewer = {
  isSuperAdmin: boolean;
  permissionKeys: string[];
};

const canRead = (viewer: SearchViewer, entity: SearchEntity): boolean =>
  viewer.isSuperAdmin || viewer.permissionKeys.includes(CRM_SEARCH_ENTITY_PERMISSION[entity]);

const safeGroup = async <T>(entity: SearchEntity, run: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await run();
  } catch (error) {
    logger.error(`CRM search for ${entity} failed: ${describeError(error)}`);
    return [];
  }
};

export const crmReportingService = {
  ...crmConnectionsService,

  async getPipelineReport(organizationId: string): Promise<PipelineReport> {
    const stages = await crmReportingRepository.pipelineStageBreakdown(organizationId);

    const totals = stages.reduce(
      (running, stage) => ({
        openDealCount: running.openDealCount + stage.openDealCount,
        openValue: running.openValue + stage.openValue,
        wonDealCount: running.wonDealCount + stage.wonDealCount,
        wonValue: running.wonValue + stage.wonValue,
        lostDealCount: running.lostDealCount + stage.lostDealCount,
      }),
      { openDealCount: 0, openValue: 0, wonDealCount: 0, wonValue: 0, lostDealCount: 0 },
    );

    return { stages, totals };
  },

  getTicketReport(organizationId: string): Promise<TicketReport> {
    return crmReportingRepository.ticketReport(organizationId);
  },

  async getOverviewReport(organizationId: string): Promise<CrmOverviewReport> {
    const [pipeline, tickets, activityTrend, openTasksDueTodayCount] = await Promise.all([
      crmReportingService.getPipelineReport(organizationId),
      crmReportingService.getTicketReport(organizationId),
      crmReportingRepository.dailyActivityCounts(organizationId),
      crmReportingRepository.openTasksDueTodayCount(organizationId),
    ]);

    return { pipeline, tickets, activityTrend, openTasksDueTodayCount };
  },

  getAttentionReport(
    organizationId: string,
    today: { dayStart: Date; dayEnd: Date },
  ): Promise<CrmAttentionReport> {
    return crmReportingRepository.attentionCounts(
      organizationId,
      today,
      subDays(new Date(), STUCK_DEAL_DAYS),
    );
  },

  async search(
    organization: OrganizationRecord,
    viewer: SearchViewer,
    query: string,
  ): Promise<CrmSearchResults> {
    const [partners, customers, deals, tickets, contacts] = await Promise.all([
      canRead(viewer, CRM_SEARCH_ENTITY.PARTNER)
        ? safeGroup(CRM_SEARCH_ENTITY.PARTNER, async () => {
            const page = await crmRelationshipsService.listPartners(organization, {
              query,
              page: 1,
              pageSize: SEARCH_RESULTS_PER_TYPE,
            });
            return page.items;
          })
        : [],
      canRead(viewer, CRM_SEARCH_ENTITY.CUSTOMER)
        ? safeGroup(CRM_SEARCH_ENTITY.CUSTOMER, async () => {
            const page = await crmRelationshipsService.listCustomers(organization, {
              query,
              page: 1,
              pageSize: SEARCH_RESULTS_PER_TYPE,
            });
            return page.items;
          })
        : [],
      canRead(viewer, CRM_SEARCH_ENTITY.DEAL)
        ? safeGroup(CRM_SEARCH_ENTITY.DEAL, () =>
            crmReportingRepository.searchDeals(organization.id, query, SEARCH_RESULTS_PER_TYPE),
          )
        : [],
      canRead(viewer, CRM_SEARCH_ENTITY.TICKET)
        ? safeGroup(CRM_SEARCH_ENTITY.TICKET, () =>
            crmReportingRepository.searchTickets(organization.id, query, SEARCH_RESULTS_PER_TYPE),
          )
        : [],
      canRead(viewer, CRM_SEARCH_ENTITY.CONTACT)
        ? safeGroup(CRM_SEARCH_ENTITY.CONTACT, () =>
            crmReportingRepository.searchContacts(organization.id, query, SEARCH_RESULTS_PER_TYPE),
          )
        : [],
    ]);

    return { partners, customers, deals, tickets, contacts };
  },
};
