import type { Prisma } from "#generated/prisma/client.js";
import { OutfitStatus } from "#generated/prisma/enums.js";
import { withActiveDiscount } from "#modules/products/product.query-helpers.js";

import { OUTFIT_LIMITS } from "./outfit.constants.js";

export const outfitPersonSelect = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
} as const satisfies Prisma.UserSelect;

const outfitMemberUserSelect = {
  ...outfitPersonSelect,
  role: true,
  accountStatus: true,
  isCreator: true,
  creatorStatus: true,
} as const satisfies Prisma.UserSelect;

const LATEST_SNAPSHOT_ONLY = 1;

export const boardProductSelect = () =>
  ({
    id: true,
    name: true,
    price: true,
    imageUrl: true,
    productTypeId: true,
    lowStock: true,
    brand: { select: { id: true, name: true } },
    sizes: { select: { label: true, stock: true }, orderBy: { sortOrder: "asc" } },
    ...withActiveDiscount(),
  }) satisfies Prisma.ProductSelect;

export const boardInclude = () =>
  ({
    members: {
      include: { user: { select: outfitMemberUserSelect } },
      orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
    },
    slots: {
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: { select: boardProductSelect() },
            addedBy: { select: outfitPersonSelect },
          },
        },
      },
    },
    snapshots: {
      orderBy: { version: "desc" },
      take: LATEST_SNAPSHOT_ONLY,
      select: { version: true },
    },
  }) satisfies Prisma.OutfitInclude;

export type OutfitBoardRow = Prisma.OutfitGetPayload<{ include: ReturnType<typeof boardInclude> }>;

export type OutfitBoardProductRow = OutfitBoardRow["slots"][number]["items"][number]["product"];

export const outfitAccessSelect = {
  id: true,
  title: true,
  status: true,
  visibility: true,
  version: true,
  sourceConversationId: true,
  conversationId: true,
  publishedVersion: true,
  maxItemsPerMember: true,
  removedAt: true,
} as const satisfies Prisma.OutfitSelect;

export type OutfitAccessRow = Prisma.OutfitGetPayload<{ select: typeof outfitAccessSelect }>;

export const summaryInclude = {
  _count: { select: { members: true, items: true } },
  items: {
    orderBy: [{ slot: { sortOrder: "asc" } }, { position: "asc" }],
    take: OUTFIT_LIMITS.CARD_PREVIEW_PRODUCT_COUNT,
    select: { product: { select: { imageUrl: true } } },
  },
} as const satisfies Prisma.OutfitInclude;

export type OutfitSummaryRow = Prisma.OutfitGetPayload<{ include: typeof summaryInclude }>;

export type OutfitSlotCopy = {
  key: string;
  label: string;
  icon: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  productTypeIds: string[];
  blocksSlotKeys: string[];
  sortOrder: number;
};

export const activeBuildStatuses = [OutfitStatus.DRAFT, OutfitStatus.LOCKED];
