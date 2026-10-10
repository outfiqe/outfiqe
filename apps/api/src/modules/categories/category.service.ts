import { HTTP_STATUS } from "#constants/http.constants.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { categoryRepository } from "./category.repository.js";
import type { CreateCategoryBody, UpdateCategoryBody } from "./category.schemas.js";
import type { CategoryRecord, CategoryWithProductCount, PublicCategory } from "./category.types.js";
import { toPublicCategory } from "./category.utils.js";

const withSlugConflictHandling = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "SLUG_TAKEN",
        "A category with this slug already exists.",
        HTTP_STATUS.CONFLICT,
      );
    }
    throw error;
  }
};

const requireCategory = async (id: string): Promise<CategoryRecord> => {
  const category = await categoryRepository.findById(id);
  if (!category) throw new AppError("NOT_FOUND", "Category not found.", HTTP_STATUS.NOT_FOUND);
  return category;
};

export const categoryService = {
  async create(input: CreateCategoryBody): Promise<CategoryWithProductCount> {
    return withSlugConflictHandling(() => categoryRepository.create(input));
  },

  async update(id: string, input: UpdateCategoryBody): Promise<CategoryWithProductCount> {
    await requireCategory(id);
    return withSlugConflictHandling(() => categoryRepository.update(id, input));
  },

  async listAll(): Promise<CategoryWithProductCount[]> {
    return categoryRepository.listAll();
  },

  async reorder(orderedIds: string[]): Promise<void> {
    const existingIds = new Set(await categoryRepository.listIds());
    const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
    const hasUnknownId = orderedIds.some((id) => !existingIds.has(id));

    if (hasDuplicates || hasUnknownId) {
      throw new AppError(
        "INVALID_ORDER",
        "The reorder request must list each category id once, and only known categories.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }

    await categoryRepository.reorder(orderedIds);
  },

  async listPublic(): Promise<PublicCategory[]> {
    const categories = await categoryRepository.listPublic();
    return categories.map(toPublicCategory);
  },

  async getBySlug(slug: string): Promise<CategoryRecord> {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new AppError("CATEGORY_NOT_FOUND", "Category not found.", HTTP_STATUS.NOT_FOUND);
    }
    return category;
  },

  async getManyBySlugs(slugs: string[]): Promise<CategoryRecord[]> {
    const categories = await categoryRepository.findManyBySlugs(slugs);
    if (categories.length !== new Set(slugs).size) {
      throw new AppError(
        "CATEGORY_NOT_FOUND",
        "One or more categories were not found.",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return categories;
  },
};
