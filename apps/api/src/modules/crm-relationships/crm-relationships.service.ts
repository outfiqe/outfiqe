import { AppError } from "#middlewares/error-handler.js";

import {
  MAX_RELATIONSHIP_PAGE_SIZE,
  MAX_RELATIONSHIP_RESULT_WINDOW,
  NOT_LINKED_TO_BRAND_REASON,
} from "./crm-relationships.constants.js";
import { crmRelationshipsRepository } from "./crm-relationships.repository.js";
import type {
  CustomerDetail,
  CustomerSummary,
  PartnerDetail,
  PartnerSummary,
  RelationshipListPage,
} from "./crm-relationships.types.js";

const NOT_FOUND_STATUS = 404;

type TenantBrandOrganization = { id: string; linkedBrandId: string | null };

type ListParams = { query: string; page: number; pageSize: number };

const emptyPage = <TItem>(): RelationshipListPage<TItem> => ({
  items: [],
  total: 0,
  hasMore: false,
  reason: NOT_LINKED_TO_BRAND_REASON,
});

const resolveWindow = (params: ListParams): { limit: number; offset: number } => {
  const limit = Math.min(Math.max(params.pageSize, 1), MAX_RELATIONSHIP_PAGE_SIZE);
  const rawOffset = Math.max(params.page - 1, 0) * limit;
  const offset = Math.min(rawOffset, MAX_RELATIONSHIP_RESULT_WINDOW);
  return { limit, offset };
};

const requireLinkedBrandId = (organization: TenantBrandOrganization): string => {
  if (!organization.linkedBrandId) {
    throw new AppError(
      "ORGANIZATION_NOT_LINKED_TO_BRAND",
      "This organization isn't linked to a brand yet, so it has no partners or customers.",
      NOT_FOUND_STATUS,
    );
  }
  return organization.linkedBrandId;
};

export const crmRelationshipsService = {
  async listPartners(
    organization: TenantBrandOrganization,
    params: ListParams,
  ): Promise<RelationshipListPage<PartnerSummary>> {
    if (!organization.linkedBrandId) return emptyPage<PartnerSummary>();

    const { limit, offset } = resolveWindow(params);
    const { items, total } = await crmRelationshipsRepository.listPartners(
      organization.linkedBrandId,
      { query: params.query, limit, offset },
    );

    return { items, total, hasMore: offset + items.length < total, reason: null };
  },

  async listCustomers(
    organization: TenantBrandOrganization,
    params: ListParams,
  ): Promise<RelationshipListPage<CustomerSummary>> {
    if (!organization.linkedBrandId) return emptyPage<CustomerSummary>();

    const { limit, offset } = resolveWindow(params);
    const { items, total } = await crmRelationshipsRepository.listCustomers(
      organization.linkedBrandId,
      { query: params.query, limit, offset },
    );

    return { items, total, hasMore: offset + items.length < total, reason: null };
  },

  async getPartner(
    organization: TenantBrandOrganization,
    creatorId: string,
  ): Promise<PartnerDetail> {
    const brandId = requireLinkedBrandId(organization);

    const core = await crmRelationshipsRepository.findPartnerCore(brandId, creatorId);
    if (!core) {
      throw new AppError("PARTNER_NOT_FOUND", "Partner not found.", NOT_FOUND_STATUS);
    }

    const [productBreakdown, recentAttributedOrders] = await Promise.all([
      crmRelationshipsRepository.partnerProductBreakdown(brandId, creatorId),
      crmRelationshipsRepository.recentAttributedOrders(brandId, creatorId),
    ]);

    return { ...core, productBreakdown, recentAttributedOrders };
  },

  async getCustomer(
    organization: TenantBrandOrganization,
    userId: string,
  ): Promise<CustomerDetail> {
    const brandId = requireLinkedBrandId(organization);

    const core = await crmRelationshipsRepository.findCustomerCore(brandId, userId);
    if (!core) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Customer not found.", NOT_FOUND_STATUS);
    }

    const recentOrders = await crmRelationshipsRepository.recentCustomerOrders(brandId, userId);
    return { ...core, recentOrders };
  },

  async isPartner(organization: TenantBrandOrganization, creatorId: string): Promise<boolean> {
    if (!organization.linkedBrandId) return false;
    return crmRelationshipsRepository.isBrandPartner(organization.linkedBrandId, creatorId);
  },
};
