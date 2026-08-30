import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import { DEFAULT_RELATIONSHIP_PAGE_SIZE } from "./crm-relationships.constants.js";
import type {
  CreatorIdParams,
  CustomerUserIdParams,
  RelationshipListQuery,
} from "./crm-relationships.schemas.js";
import { crmRelationshipsService } from "./crm-relationships.service.js";

const readListParams = (res: Response) => {
  const { q, page, pageSize } = validated.query<RelationshipListQuery>(res);
  return {
    query: q ?? "",
    page: page ?? 1,
    pageSize: pageSize ?? DEFAULT_RELATIONSHIP_PAGE_SIZE,
  };
};

export const crmRelationshipsController = {
  async listPartners(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const page = await crmRelationshipsService.listPartners(organization, readListParams(res));
    sendSuccess(res, page, "CRM partners.");
  },

  async getPartner(_req: Request, res: Response) {
    const { creatorId } = validated.params<CreatorIdParams>(res);
    const organization = getResolvedOrganization(res);

    const partner = await crmRelationshipsService.getPartner(organization, creatorId);
    sendSuccess(res, partner, "CRM partner.");
  },

  async listCustomers(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const page = await crmRelationshipsService.listCustomers(organization, readListParams(res));
    sendSuccess(res, page, "CRM customers.");
  },

  async getCustomer(_req: Request, res: Response) {
    const { userId } = validated.params<CustomerUserIdParams>(res);
    const organization = getResolvedOrganization(res);

    const customer = await crmRelationshipsService.getCustomer(organization, userId);
    sendSuccess(res, customer, "CRM customer.");
  },
};
