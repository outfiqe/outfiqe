import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AdjustStockBody,
  AutocompleteQuery,
  CreateProductBody,
  ListMineProductsQuery,
  ListPublicProductsQuery,
  ListReviewProductsQuery,
  ProductIdParam,
  UpdateProductBody,
} from "./product.schemas.js";
import { productService } from "./product.service.js";

const CREATED_STATUS = 201;

export const productController = {
  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateProductBody>(res);

    const product = await productService.create(userId, body);
    sendSuccess(res, product, "Product submitted for review.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ProductIdParam>(res);
    const body = validated.body<UpdateProductBody>(res);

    const product = await productService.update(userId, id, body);
    sendSuccess(res, product, "Product updated.");
  },

  async adjustStock(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ProductIdParam>(res);
    const body = validated.body<AdjustStockBody>(res);

    const sizes = await productService.adjustStock(userId, id, body);
    sendSuccess(res, sizes, "Stock updated.");
  },

  async delete(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ProductIdParam>(res);

    await productService.delete(userId, id);
    sendSuccess(res, null, "Product deleted.");
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListMineProductsQuery>(res);
    const page = await productService.listMine(userId, query);
    sendSuccess(res, page, "Your products.");
  },

  async listForReview(_req: Request, res: Response) {
    const query = validated.query<ListReviewProductsQuery>(res);
    const page = await productService.listForReview(query);
    sendSuccess(res, page, "Products awaiting review.");
  },

  async autocomplete(_req: Request, res: Response) {
    const query = validated.query<AutocompleteQuery>(res);
    const suggestions = await productService.autocomplete(query);
    sendSuccess(res, suggestions, "Suggestions.");
  },

  async listPublic(_req: Request, res: Response) {
    const query = validated.query<ListPublicProductsQuery>(res);
    const page = await productService.listPublic(query);
    sendSuccess(res, page, "Products.");
  },

  async listTypes(_req: Request, res: Response) {
    const types = await productService.listTypes();
    sendSuccess(res, types, "Product types.");
  },

  async listTrending(_req: Request, res: Response) {
    const products = await productService.listTrending();
    sendSuccess(res, products, "Trending products.");
  },

  async listNewArrivals(_req: Request, res: Response) {
    const products = await productService.listNewArrivals();
    sendSuccess(res, products, "New arrivals.");
  },

  async getPublicById(_req: Request, res: Response) {
    const { id } = validated.params<ProductIdParam>(res);
    const principal = getAuthPrincipal(res);
    const product = await productService.getPublicDetail(id, principal?.userId);
    sendSuccess(res, product, "Product.");
  },

  async approve(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ProductIdParam>(res);

    await productService.approve(id, userId);
    sendSuccess(res, null, "Product approved.");
  },

  async reject(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ProductIdParam>(res);

    await productService.reject(id, userId);
    sendSuccess(res, null, "Product rejected.");
  },
};
