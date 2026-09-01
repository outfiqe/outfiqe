import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type {
  ContactIdParams,
  ContactListQuery,
  CreateContactBody,
  UpdateContactBody,
} from "./crm-contacts.schemas.js";
import { crmContactsService } from "./crm-contacts.service.js";

const CREATED_STATUS = 201;

export const crmContactsController = {
  async listContacts(_req: Request, res: Response) {
    const query = validated.query<ContactListQuery>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmContactsService.listContacts(organization.id, query), "Contacts.");
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
    sendSuccess(res, contact, "Contact created.", CREATED_STATUS);
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
