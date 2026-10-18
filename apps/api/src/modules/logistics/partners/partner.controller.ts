import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreatePartnerStatusImportBody,
  PartnerAccountBody,
  PartnerAccountParam,
  PartnerBody,
  PartnerIdParam,
  PartnerStatusImportParam,
  ReplacePartnerZonesBody,
  SavePartnerStatusMapBody,
} from "./partner.schemas.js";
import { logisticsPartnerService } from "./partner.service.js";
import { logisticsPartnerStatusImportService } from "./partner-status-import.service.js";

export const logisticsPartnerController = {
  async list(_req: Request, res: Response) {
    const partners = await logisticsPartnerService.listPartners();
    sendSuccess(res, { partners }, "Delivery partners.");
  },

  async get(_req: Request, res: Response) {
    const { partnerId } = validated.params<PartnerIdParam>(res);
    sendSuccess(res, await logisticsPartnerService.getPartner(partnerId), "Delivery partner.");
  },

  async create(_req: Request, res: Response) {
    const partner = await logisticsPartnerService.createPartner(validated.body<PartnerBody>(res));
    sendSuccess(res, partner, "Delivery partner added.", HTTP_STATUS.CREATED);
  },

  async update(_req: Request, res: Response) {
    const { partnerId } = validated.params<PartnerIdParam>(res);
    const partner = await logisticsPartnerService.updatePartner(
      partnerId,
      validated.body<PartnerBody>(res),
    );
    sendSuccess(res, partner, "Delivery partner updated.");
  },

  async saveAccount(_req: Request, res: Response) {
    const { partnerId, hubId } = validated.params<PartnerAccountParam>(res);
    const partner = await logisticsPartnerService.savePartnerAccount(
      partnerId,
      hubId,
      validated.body<PartnerAccountBody>(res),
    );
    sendSuccess(res, partner, "Merchant account saved.");
  },

  async replaceZones(_req: Request, res: Response) {
    const { partnerId } = validated.params<PartnerIdParam>(res);
    const partner = await logisticsPartnerService.replacePartnerZones(
      partnerId,
      validated.body<ReplacePartnerZonesBody>(res),
    );
    sendSuccess(res, partner, "Delivery areas saved.");
  },

  async saveStatusMap(_req: Request, res: Response) {
    const { partnerId } = validated.params<PartnerIdParam>(res);
    const partner = await logisticsPartnerService.savePartnerStatusMap(
      partnerId,
      validated.body<SavePartnerStatusMapBody>(res),
    );
    sendSuccess(res, partner, "Status names saved.");
  },

  async createStatusImport(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { partnerId } = validated.params<PartnerIdParam>(res);
    const statusImport = await logisticsPartnerStatusImportService.importPartnerStatuses(
      userId,
      partnerId,
      validated.body<CreatePartnerStatusImportBody>(res),
    );
    sendSuccess(res, statusImport, "Status sheet imported.", HTTP_STATUS.CREATED);
  },

  async getStatusImport(_req: Request, res: Response) {
    const { partnerId, importId } = validated.params<PartnerStatusImportParam>(res);
    const statusImport = await logisticsPartnerStatusImportService.getStatusImport(
      partnerId,
      importId,
    );
    sendSuccess(res, statusImport, "Status sheet import.");
  },
};
