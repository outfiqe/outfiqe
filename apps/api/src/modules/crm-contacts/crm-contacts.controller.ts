import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { CSV_CONTENT_TYPE } from "#lib/csv-writer.utils.js";
import logger from "#lib/winston.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type {
  ContactExportQuery,
  ContactIdParams,
  ContactListQuery,
  CreateContactBody,
  UpdateContactBody,
} from "./crm-contacts.schemas.js";
import { crmContactsService } from "./crm-contacts.service.js";

export const crmContactsController = {
  async listContacts(_req: Request, res: Response) {
    const query = validated.query<ContactListQuery>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmContactsService.listContacts(organization.id, query), "Contacts.");
  },

  async exportContacts(_req: Request, res: Response) {
    const filters = validated.query<ContactExportQuery>(res);
    const organization = getResolvedOrganization(res);
    const { csv, rowCount } = await crmContactsService.exportContactsCsv(organization.id, filters);

    const exporterId = getAuthPrincipal(res)?.userId ?? "unknown";
    logger.info(
      `CRM contacts export: org=${organization.id} exporter=${exporterId} rows=${rowCount}`,
    );

    res
      .status(HTTP_STATUS.OK)
      .set("Content-Type", CSV_CONTENT_TYPE)
      .set("Content-Disposition", `attachment; filename="contacts-${Date.now()}.csv"`)
      .send(csv);
  },

  async getContact(_req: Request, res: Response) {
    const { contactId } = validated.params<ContactIdParams>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmContactsService.getContact(organization.id, contactId), "Contact.");
  },

  async createContact(_req: Request, res: Response) {
    const body = validated.body<CreateContactBody>(res);
    const organization = getResolvedOrganization(res);
    const contact = await crmContactsService.createContact(organization.id, body);
    sendSuccess(res, contact, "Contact created.", HTTP_STATUS.CREATED);
  },

  async updateContact(_req: Request, res: Response) {
    const { contactId } = validated.params<ContactIdParams>(res);
    const body = validated.body<UpdateContactBody>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(
      res,
      await crmContactsService.updateContact(organization.id, contactId, body),
      "Contact updated.",
    );
  },

  async deleteContact(_req: Request, res: Response) {
    const { contactId } = validated.params<ContactIdParams>(res);
    const organization = getResolvedOrganization(res);
    await crmContactsService.deleteContact(organization.id, contactId);
    sendSuccess(res, null, "Contact deleted.");
  },
};
