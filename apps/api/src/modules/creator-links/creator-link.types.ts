import type { CreatorLinkStatus, CreatorLinkType } from "#generated/prisma/enums.js";

export type CreatorLinkRecord = {
  id: string;
  creatorId: string;
  productId: string | null;
  token: string;
  type: CreatorLinkType;
  status: CreatorLinkStatus;
  consumedAt: Date | null;
  createdAt: Date;
};

export type CreatorLinkWithTarget = CreatorLinkRecord & {
  creator: { handle: string };
  product: { id: string } | null;
};

export type CreatorLinkWithClickCount = CreatorLinkRecord & {
  product: { name: string } | null;
  _count: { clicks: number };
};

export type CreateCreatorLinkInput = {
  creatorId: string;
  productId?: string;
  token: string;
  type: CreatorLinkType;
};

export type CreatorLinkView = {
  id: string;
  token: string;
  shareUrl: string;
  type: CreatorLinkType;
  status: CreatorLinkStatus;
  productId: string | null;
  productName: string | null;
  clickCount: number;
  createdAt: string;
};
