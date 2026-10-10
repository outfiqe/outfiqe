import {
  findBlockedSlotKeys,
  type OutfitBoardItem,
  type OutfitSlotRule,
  PUBLIC_BUILD_SORT,
  type PublicBuildSort,
} from "@outfiqe/utils";
import { z } from "zod";

import {
  AccountStatus,
  CreatorStatus,
  OutfitMemberRole,
  UserRole,
} from "#generated/prisma/enums.js";
import {
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";

import type { OutfitRuleItemRow } from "./items/item.repository.js";
import {
  OUTFIT_ITEM_AVAILABILITY,
  OUTFIT_VERSION_HEADER_PATTERN,
  OUTFIT_VIEWER_ROLE,
} from "./outfit.constants.js";
import type {
  OutfitBoardProductRow,
  OutfitBoardRow,
  OutfitSummaryRow,
} from "./outfit.query-helpers.js";
import type {
  OutfitBoardLimitsView,
  OutfitBoardView,
  OutfitItemAvailability,
  OutfitProductView,
  OutfitSnapshotItem,
  OutfitSummaryView,
  OutfitViewerRole,
} from "./outfit.types.js";
import type { OutfitCoverPhotoView } from "./photos/photo.types.js";
import type { PublicFeedRow } from "./social/social.repository.js";

const NO_STOCK = 0;
const EMPTY_TOTAL = 0;
const VERSION_NUMBER_GROUP = 1;

export const canReceiveOffers = (user: {
  role: UserRole;
  accountStatus: AccountStatus;
  isCreator: boolean;
  creatorStatus: CreatorStatus | null;
}): boolean =>
  user.role === UserRole.CUSTOMER &&
  user.accountStatus === AccountStatus.ACTIVE &&
  user.isCreator &&
  user.creatorStatus === CreatorStatus.APPROVED;

export const hasStock = (sizes: readonly { stock: number }[]): boolean =>
  sizes.some((size) => size.stock > NO_STOCK);

export const toItemAvailability = ({
  sizes,
  lowStock,
}: Pick<OutfitBoardProductRow, "sizes" | "lowStock">): OutfitItemAvailability => {
  if (!hasStock(sizes)) return OUTFIT_ITEM_AVAILABILITY.OUT_OF_STOCK;
  return lowStock ? OUTFIT_ITEM_AVAILABILITY.LOW_STOCK : OUTFIT_ITEM_AVAILABILITY.IN_STOCK;
};

export const toLiveUnitPrice = ({
  price,
  discounts,
}: Pick<OutfitBoardProductRow, "price" | "discounts">): number =>
  resolveBrandFundedUnitPrice(price, toActiveBrandDiscount(discounts[0]));

export const toProductView = (product: OutfitBoardProductRow): OutfitProductView => ({
  id: product.id,
  name: product.name,
  imageUrl: product.imageUrl,
  price: toLiveUnitPrice(product),
  listPrice: product.price,
  productTypeId: product.productTypeId,
  brand: product.brand,
  availability: toItemAvailability(product),
  sizes: product.sizes.map(({ label, stock }) => ({ label, isInStock: stock > NO_STOCK })),
});

export const toViewerRole = (memberRole: OutfitMemberRole | null): OutfitViewerRole => {
  if (memberRole === OutfitMemberRole.OWNER) return OUTFIT_VIEWER_ROLE.OWNER;
  if (memberRole === OutfitMemberRole.EDITOR) return OUTFIT_VIEWER_ROLE.EDITOR;
  return OUTFIT_VIEWER_ROLE.VIEWER;
};

export const toSlotRule = (slot: {
  key: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  productTypeIds: string[];
  blocksSlotKeys: string[];
}): OutfitSlotRule => ({
  key: slot.key,
  maxItems: slot.maxItems,
  acceptsAnyProductType: slot.acceptsAnyProductType,
  productTypeIds: slot.productTypeIds,
  blocksSlotKeys: slot.blocksSlotKeys,
});

export const toBoardItem = (item: OutfitRuleItemRow): OutfitBoardItem => ({
  slotKey: item.slotKey,
  position: item.position,
  productId: item.productId,
  addedById: item.addedById,
});

const toIsoOrNull = (date: Date | null): string | null => date?.toISOString() ?? null;

export const toBoardView = (
  board: OutfitBoardRow,
  { myRole, limits }: { myRole: OutfitViewerRole; limits: OutfitBoardLimitsView },
): Omit<OutfitBoardView, "photos"> => {
  const { slots, members } = board;
  const [latestSnapshot] = board.snapshots;
  const boardItems = slots.flatMap((slot) =>
    slot.items.map((item) => ({
      slotKey: slot.key,
      position: item.position,
      productId: item.productId,
      addedById: item.addedById,
    })),
  );
  const blockedSlotKeys = new Set(findBlockedSlotKeys(slots.map(toSlotRule), boardItems));
  const products = slots.flatMap((slot) => slot.items.map((item) => item.product));
  const total = products.reduce((sum, product) => sum + toLiveUnitPrice(product), EMPTY_TOTAL);
  const isMember = myRole !== OUTFIT_VIEWER_ROLE.VIEWER;

  return {
    id: board.id,
    title: board.title,
    status: board.status,
    visibility: board.visibility,
    version: board.version,
    budget: board.budget,
    maxItemsPerMember: board.maxItemsPerMember,
    publishedVersion: board.publishedVersion,
    lastLockedVersion: latestSnapshot?.version ?? null,
    conversationId: isMember ? board.conversationId : null,
    sourceConversationId: board.sourceConversationId,
    lockedAt: toIsoOrNull(board.lockedAt),
    archivedAt: toIsoOrNull(board.archivedAt),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    myRole,
    members: members.map(({ user, role, isHappy, joinedAt }) => ({
      user: { id: user.id, name: user.name, handle: user.handle, avatarUrl: user.avatarUrl },
      role,
      isHappy,
      joinedAt: joinedAt.toISOString(),
      canReceiveOffers: canReceiveOffers(user),
    })),
    slots: slots.map((slot) => ({
      key: slot.key,
      maxItems: slot.maxItems,
      acceptsAnyProductType: slot.acceptsAnyProductType,
      productTypeIds: slot.productTypeIds,
      blocksSlotKeys: slot.blocksSlotKeys,
      label: slot.label,
      icon: slot.icon,
      isBlocked: blockedSlotKeys.has(slot.key),
      items: slot.items.map((item) => ({
        position: item.position,
        product: toProductView(item.product),
        addedBy: item.addedBy,
        addedAt: item.addedAt.toISOString(),
      })),
    })),
    itemCount: products.length,
    total,
    isOverBudget: board.budget !== null && total > board.budget,
    isFullyAvailable: products.every((product) => hasStock(product.sizes)),
    isEveryoneHappy: members.every((member) => member.isHappy),
    limits,
  };
};

export const toSnapshotItems = (board: OutfitBoardRow): OutfitSnapshotItem[] =>
  board.slots.flatMap((slot) =>
    slot.items.map(({ position, product }) => ({
      slotKey: slot.key,
      slotLabel: slot.label,
      position,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      brandName: product.brand.name,
      unitPrice: toLiveUnitPrice(product),
    })),
  );

const snapshotItemSchema = z.object({
  slotKey: z.string(),
  slotLabel: z.string(),
  position: z.number(),
  productId: z.string(),
  productName: z.string(),
  imageUrl: z.string().nullable(),
  brandName: z.string(),
  unitPrice: z.number(),
});

export const parseSnapshotItems = (storedItems: unknown): OutfitSnapshotItem[] => {
  const parsed = z.array(snapshotItemSchema).safeParse(storedItems);
  return parsed.success ? parsed.data : [];
};

export const toSummaryView = (
  { _count, items, ...outfit }: OutfitSummaryRow,
  myRole: OutfitViewerRole,
  coverPhotos: OutfitCoverPhotoView[],
): OutfitSummaryView => ({
  id: outfit.id,
  title: outfit.title,
  status: outfit.status,
  visibility: outfit.visibility,
  version: outfit.version,
  itemCount: _count.items,
  memberCount: _count.members,
  previewImageUrls: items
    .map(({ product }) => product.imageUrl)
    .filter((imageUrl): imageUrl is string => imageUrl !== null),
  coverPhotos,
  myRole,
  updatedAt: outfit.updatedAt.toISOString(),
});

export const parseVersionHeader = (headerValue: string): number | null => {
  const match = OUTFIT_VERSION_HEADER_PATTERN.exec(headerValue.trim());
  const versionText = match?.[VERSION_NUMBER_GROUP];
  return versionText === undefined ? null : Number.parseInt(versionText, 10);
};

export const toVersionHeaderValue = (version: number): string => String(version);

export const toPublicFeedCursorValue = (
  { madePublicAt, likeCount, total }: PublicFeedRow,
  sort: PublicBuildSort,
): string => {
  if (sort === PUBLIC_BUILD_SORT.NEWEST) return madePublicAt.toISOString();
  if (sort === PUBLIC_BUILD_SORT.MOST_CHERIQED) return String(likeCount);
  return String(total);
};
