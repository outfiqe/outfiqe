import { creatorLookRepository } from "./creatorLook.repository.js";
import { productRepository } from "../products/product.repository.js";
import { toPublicProduct } from "../products/product.service.js";
import { userRepository } from "../users/user.repository.js";

import { AppError } from "../../shared/middlewares/error-handler.js";
import { CreatorStatus } from "../../generated/prisma/enums.js";

import type { CreateCreatorLookBody, ListCreatorLooksQuery } from "./creatorLook.schemas.js";
import type { CreatorLookSummary, TaggedProductPage } from "./creatorLook.types.js";
import type { PublicProduct } from "../products/product.types.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

const requireApprovedCreator = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user || !user.isCreator || user.creatorStatus !== CreatorStatus.APPROVED) {
    throw new AppError("NOT_A_CREATOR", "Only approved creators can post looks.", FORBIDDEN_STATUS);
  }
};

const requireApprovedProducts = async (productIds: string[]): Promise<void> => {
  const products = await productRepository.findApprovedByIds(productIds);
  if (products.length !== productIds.length) {
    throw new AppError(
      "PRODUCT_NOT_AVAILABLE",
      "One or more tagged products aren't available.",
      NOT_FOUND_STATUS,
    );
  }
};

export const creatorLookService = {
  async create(userId: string, input: CreateCreatorLookBody): Promise<CreatorLookSummary> {
    await requireApprovedCreator(userId);
    await requireApprovedProducts(input.productIds);

    return creatorLookRepository.create({
      creatorId: userId,
      imageUrl: input.imageUrl,
      caption: input.caption,
      productIds: input.productIds,
    });
  },

  async listMine(userId: string): Promise<CreatorLookSummary[]> {
    return creatorLookRepository.listByCreatorId(userId);
  },

  async listPublic(query: ListCreatorLooksQuery): Promise<TaggedProductPage<PublicProduct>> {
    const page = await creatorLookRepository.listPublicTaggedProducts(query);
    return { products: page.products.map(toPublicProduct), nextCursor: page.nextCursor };
  },
};
