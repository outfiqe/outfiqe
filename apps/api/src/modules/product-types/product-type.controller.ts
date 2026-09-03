import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateProductTypeBody,
  ProductTypeIdParam,
  ReorderProductTypesBody,
  UpdateProductTypeBody,
} from "./product-type.schemas.js";
import { productTypeService } from "./product-type.service.js";

const CREATED_STATUS = 201;

export const productTypeController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateProductTypeBody>(res);
    const productType = await productTypeService.create(body);
    sendSuccess(res, productType, "Garment type created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { id } = validated.params<ProductTypeIdParam>(res);
    const body = validated.body<UpdateProductTypeBody>(res);
    const productType = await productTypeService.update(id, body);
    sendSuccess(res, productType, "Garment type updated.");
  },

  async reorder(_req: Request, res: Response) {
    const { orderedIds } = validated.body<ReorderProductTypesBody>(res);
    await productTypeService.reorder(orderedIds);
    sendSuccess(res, null, "Garment types reordered.");
  },

  async listAll(_req: Request, res: Response) {
    const productTypes = await productTypeService.listForAdmin();
    sendSuccess(res, productTypes, "Garment types.");
  },

  async listActive(_req: Request, res: Response) {
    const productTypes = await productTypeService.listForStorefront();
    sendSuccess(res, productTypes, "Garment types.");
  },

  async listAssignable(_req: Request, res: Response) {
    const productTypes = await productTypeService.listAssignable();
    sendSuccess(res, productTypes, "Garment types you can add products to.");
  },
};
