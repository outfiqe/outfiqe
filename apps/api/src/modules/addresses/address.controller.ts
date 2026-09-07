import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { AddressIdParam, CreateAddressBody, UpdateAddressBody } from "./address.schemas.js";
import { addressService } from "./address.service.js";

const CREATED_STATUS = 201;

export const addressController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const addresses = await addressService.listForUser(userId);
    sendSuccess(res, addresses, "Saved addresses.");
  },

  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateAddressBody>(res);
    const address = await addressService.create(userId, body);
    sendSuccess(res, address, "Address saved.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<AddressIdParam>(res);
    const body = validated.body<UpdateAddressBody>(res);
    const address = await addressService.update(userId, id, body);
    sendSuccess(res, address, "Address updated.");
  },

  async remove(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<AddressIdParam>(res);
    await addressService.remove(userId, id);
    sendSuccess(res, null, "Address removed.");
  },

  async setDefault(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<AddressIdParam>(res);
    await addressService.setDefault(userId, id);
    sendSuccess(res, null, "Default address updated.");
  },
};
