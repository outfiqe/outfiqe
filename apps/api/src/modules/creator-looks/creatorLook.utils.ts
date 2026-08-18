import type { CreatorLookEditDetail, CreatorLookSummary } from "./creatorLook.types.js";

export const toSummary = ({
  id,
  creatorId,
  imageUrl,
  caption,
  createdAt,
  taggedProducts,
}: {
  id: string;
  creatorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
} & {
  taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
}): CreatorLookSummary => ({
  id,
  creatorId,
  imageUrl,
  caption,
  createdAt,
  taggedProducts: taggedProducts.map((tagged) => tagged.product),
});

export const toEditDetail = ({
  id,
  imageUrl,
  images,
  caption,
  taggedProducts,
}: {
  id: string;
  imageUrl: string;
  images: { url: string }[];
  caption: string | null;
  taggedProducts: {
    productId: string;
    sizeWorn: string | null;
    product: {
      id: string;
      name: string;
      price: number;
      imageUrl: string | null;
      brand: { name: string };
    };
  }[];
}): CreatorLookEditDetail => ({
  id,
  imageUrls: images.length > 0 ? images.map((image) => image.url) : [imageUrl],
  caption,
  taggedProducts: taggedProducts.map(({ productId, sizeWorn, product }) => ({
    productId,
    sizeWorn: sizeWorn ?? "",
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand.name,
      price: product.price,
      imageUrl: product.imageUrl,
    },
  })),
});

export type SimpleCursor = { c: string; i: string };
export type TrendingSnapshotCursor = { sessionId: string; offset: number };
export type FeaturedLookCursor = { e: number; i: string };
