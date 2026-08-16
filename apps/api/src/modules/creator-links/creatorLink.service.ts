import { CreatorLinkStatus, CreatorLinkType } from "#generated/prisma/enums.js";
import { requireApprovedCreator } from "#lib/creator-guard.utils.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productRepository } from "#modules/products/product.repository.js";

import { creatorLinkRepository } from "./creatorLink.repository.js";
import type { CreatorLinkView } from "./creatorLink.types.js";
import { buildTargetUrl, toCreatorLinkView } from "./creatorLink.utils.js";

const NOT_FOUND_STATUS = 404;

const requireApprovedProduct = async (productId: string): Promise<{ name: string }> => {
  const [product] = await productRepository.findApprovedByIds([productId]);
  if (!product) {
    throw new AppError("PRODUCT_NOT_AVAILABLE", "This product isn't available.", NOT_FOUND_STATUS);
  }
  return product;
};

export const creatorLinkService = {
  async createInternal(creatorId: string, productId: string): Promise<CreatorLinkView> {
    await requireApprovedCreator(creatorId, "Only approved creators can generate links.");
    const product = await requireApprovedProduct(productId);

    const link = await creatorLinkRepository.create({
      creatorId,
      productId,
      token: generateOpaqueToken(),
      type: CreatorLinkType.INTERNAL_SINGLE_USE,
    });

    return toCreatorLinkView({ ...link, product, clickCount: 0 });
  },

  async getOrCreateExternal(creatorId: string, productId?: string): Promise<CreatorLinkView> {
    await requireApprovedCreator(creatorId, "Only approved creators can generate links.");
    const product = productId ? await requireApprovedProduct(productId) : null;

    const existing = await creatorLinkRepository.findActiveExternalLink(
      creatorId,
      productId ?? null,
    );
    if (existing) {
      return toCreatorLinkView({ ...existing, product, clickCount: 0 });
    }

    const link = await creatorLinkRepository.create({
      creatorId,
      productId,
      token: generateOpaqueToken(),
      type: CreatorLinkType.EXTERNAL_REUSABLE,
    });

    return toCreatorLinkView({ ...link, product, clickCount: 0 });
  },

  async listMine(
    creatorId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<{ items: CreatorLinkView[]; nextCursor: string | null }> {
    const rows = await creatorLinkRepository.listForCreator(creatorId, { cursor, limit });
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return {
      items: pagedRows.map(({ _count, ...row }) =>
        toCreatorLinkView({ ...row, clickCount: _count.clicks }),
      ),
      nextCursor,
    };
  },

  async recordClick(
    token: string,
    sessionId: string,
    userId: string | undefined,
  ): Promise<{ targetUrl: string }> {
    const link = await creatorLinkRepository.findByToken(token);
    if (!link || link.status === CreatorLinkStatus.REVOKED) {
      throw new AppError("LINK_NOT_FOUND", "This link is no longer available.", NOT_FOUND_STATUS);
    }

    const shouldRecordClick =
      link.type === CreatorLinkType.INTERNAL_SINGLE_USE
        ? await creatorLinkRepository.consumeSingleUse(link.id)
        : true;

    if (shouldRecordClick) {
      await creatorLinkRepository.recordClick({ linkId: link.id, userId, sessionId });
    }

    return { targetUrl: buildTargetUrl(link.productId, link.creator.handle) };
  },
};
