import { requireBrandId } from "#lib/brand-guard.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { sizeStandardRepository } from "./sizeStandard.repository.js";
import type { CreateSizeStandardBody, UpdateSizeStandardBody } from "./sizeStandard.schemas.js";
import type { OwnedSizeStandardLabel, SizeStandardView } from "./sizeStandard.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const sizeStandardNotFound = (): AppError =>
  new AppError("SIZE_STANDARD_NOT_FOUND", "That size standard wasn't found.", NOT_FOUND_STATUS);

const rethrowNameTaken = (error: unknown): never => {
  if (isUniqueConstraintError(error)) {
    throw new AppError(
      "SIZE_STANDARD_NAME_TAKEN",
      "You already have a size standard with that name.",
      CONFLICT_STATUS,
    );
  }
  throw error;
};

const requireOwnedStandard = async (
  brandId: string,
  standardId: string,
): Promise<SizeStandardView> => {
  const standard = await sizeStandardRepository.findActiveForBrand(brandId, standardId);
  if (!standard) throw sizeStandardNotFound();
  return standard;
};

export const sizeStandardService = {
  async listMine(userId: string): Promise<SizeStandardView[]> {
    const brandId = await requireBrandId(userId);
    return sizeStandardRepository.listActiveForBrand(brandId);
  },

  async create(
    userId: string,
    { name, labels }: CreateSizeStandardBody,
  ): Promise<SizeStandardView> {
    const brandId = await requireBrandId(userId);
    return sizeStandardRepository.create(brandId, name, labels).catch(rethrowNameTaken);
  },

  async update(
    userId: string,
    standardId: string,
    changes: UpdateSizeStandardBody,
  ): Promise<SizeStandardView> {
    const brandId = await requireBrandId(userId);
    await requireOwnedStandard(brandId, standardId);
    return sizeStandardRepository.update(standardId, changes).catch(rethrowNameTaken);
  },

  async archive(userId: string, standardId: string): Promise<void> {
    const brandId = await requireBrandId(userId);
    await requireOwnedStandard(brandId, standardId);
    await sizeStandardRepository.archive(standardId);
  },

  async getOwnedLabelsInStandardOrder(
    brandId: string,
    standardId: string,
    labelIds: string[],
  ): Promise<OwnedSizeStandardLabel[]> {
    const ownedLabels = await sizeStandardRepository.findOwnedLabels(brandId, standardId, labelIds);
    if (ownedLabels.length !== new Set(labelIds).size) throw sizeStandardNotFound();
    return ownedLabels.sort((first, second) => first.sortOrder - second.sortOrder);
  },
};
