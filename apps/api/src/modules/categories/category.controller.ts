import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CategoryIdParam,
  CreateCategoryBody,
  ReorderCategoriesBody,
  UpdateCategoryBody,
} from "./category.schemas.js";
import { categoryService } from "./category.service.js";

const CREATED_STATUS = 201;

export const categoryController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateCategoryBody>(res);
    const category = await categoryService.create(body);
    sendSuccess(res, category, "Category created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { id } = validated.params<CategoryIdParam>(res);
    const body = validated.body<UpdateCategoryBody>(res);
    const category = await categoryService.update(id, body);
    sendSuccess(res, category, "Category updated.");
  },

  async listAll(_req: Request, res: Response) {
    const categories = await categoryService.listAll();
    sendSuccess(res, categories, "Categories.");
  },

  async reorder(_req: Request, res: Response) {
    const { orderedIds } = validated.body<ReorderCategoriesBody>(res);
    await categoryService.reorder(orderedIds);
    sendSuccess(res, null, "Categories reordered.");
  },

  async listPublic(_req: Request, res: Response) {
    const categories = await categoryService.listPublic();
    sendSuccess(res, categories, "Categories.");
  },
};
