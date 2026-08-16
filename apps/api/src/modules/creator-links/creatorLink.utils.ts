import { env } from "#config/env.config.js";

import type { CreatorLinkRecord, CreatorLinkView } from "./creatorLink.types.js";

export const buildShareUrl = (token: string): string => `${env.FRONTEND_URL}/r/${token}`;

export const buildTargetUrl = (productId: string | null, creatorHandle: string): string =>
  productId
    ? `${env.FRONTEND_URL}/product/${productId}`
    : `${env.FRONTEND_URL}/creator/${creatorHandle}`;

type ToCreatorLinkViewInput = CreatorLinkRecord & {
  product?: { name: string } | null;
  clickCount: number;
};

export const toCreatorLinkView = (link: ToCreatorLinkViewInput): CreatorLinkView => {
  const { id, token, type, status, productId, product, clickCount, createdAt } = link;

  return {
    id,
    token,
    shareUrl: buildShareUrl(token),
    type,
    status,
    productId,
    productName: product?.name ?? null,
    clickCount,
    createdAt: createdAt.toISOString(),
  };
};
