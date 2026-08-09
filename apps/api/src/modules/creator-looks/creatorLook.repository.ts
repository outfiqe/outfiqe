import { prisma } from "../../shared/db/prisma.js";

import { ProductStatus } from "../../generated/prisma/enums.js";
import type { ProductWithBrand } from "../products/product.types.js";
import type {
  CreateCreatorLookInput,
  CreatorLookSummary,
  TaggedProductPage,
} from "./creatorLook.types.js";

const taggedProductsInclude = {
  taggedProducts: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
} as const;

const toSummary = (
  look: {
    id: string;
    creatorId: string;
    imageUrl: string;
    caption: string | null;
    createdAt: Date;
  } & {
    taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
  },
): CreatorLookSummary => ({
  id: look.id,
  creatorId: look.creatorId,
  imageUrl: look.imageUrl,
  caption: look.caption,
  createdAt: look.createdAt,
  taggedProducts: look.taggedProducts.map((tagged) => tagged.product),
});

export const creatorLookRepository = {
  async create(input: CreateCreatorLookInput): Promise<CreatorLookSummary> {
    const look = await prisma.creatorLook.create({
      data: {
        creatorId: input.creatorId,
        imageUrl: input.imageUrl,
        caption: input.caption,
        taggedProducts: { create: input.productIds.map((productId) => ({ productId })) },
      },
      include: taggedProductsInclude,
    });

    return toSummary(look);
  },

  async listByCreatorId(creatorId: string): Promise<CreatorLookSummary[]> {
    const looks = await prisma.creatorLook.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
      include: taggedProductsInclude,
    });

    return looks.map(toSummary);
  },

  async listPublicTaggedProducts(params: {
    cursor?: string;
    limit: number;
  }): Promise<TaggedProductPage<ProductWithBrand>> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: { product: { status: ProductStatus.APPROVED } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { product: { include: { brand: { select: { name: true } } } } },
    });

    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;
    const lastRow = page[page.length - 1];

    return {
      products: page.map((row) => row.product),
      nextCursor: hasMore && lastRow ? lastRow.id : null,
    };
  },
};
