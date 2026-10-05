import type {
  OutfitEventType,
  OutfitMemberRole,
  OutfitStatus,
  OutfitVisibility,
} from "#generated/prisma/enums.js";
import type { CartView } from "#modules/cart/cart.types.js";

import type {
  BUILD_ITEM_LEFT_OUT_REASON,
  OUTFIT_ITEM_AVAILABILITY,
  OUTFIT_VIEWER_ROLE,
} from "./outfit.constants.js";

export type OutfitViewerRole = (typeof OUTFIT_VIEWER_ROLE)[keyof typeof OUTFIT_VIEWER_ROLE];

export type BuildItemLeftOutReason =
  (typeof BUILD_ITEM_LEFT_OUT_REASON)[keyof typeof BUILD_ITEM_LEFT_OUT_REASON];

export type BuildCartResult = {
  cart: CartView;
  addedProductIds: string[];
  leftOut: { productId: string; reason: BuildItemLeftOutReason }[];
};

export type OutfitItemAvailability =
  (typeof OUTFIT_ITEM_AVAILABILITY)[keyof typeof OUTFIT_ITEM_AVAILABILITY];

export type OutfitPersonView = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type OutfitProductView = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  listPrice: number;
  productTypeId: string;
  brand: { id: string; name: string };
  availability: OutfitItemAvailability;
  sizes: { label: string; isInStock: boolean }[];
};

export type OutfitItemView = {
  position: number;
  product: OutfitProductView;
  addedBy: OutfitPersonView | null;
  addedAt: string;
};

export type OutfitSlotView = {
  key: string;
  label: string;
  icon: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  productTypeIds: string[];
  blocksSlotKeys: string[];
  isBlocked: boolean;
  items: OutfitItemView[];
};

export type OutfitMemberView = {
  user: OutfitPersonView;
  role: OutfitMemberRole;
  isHappy: boolean;
  joinedAt: string;
  canReceiveOffers: boolean;
};

export type OutfitBoardLimitsView = {
  maxItemsPerBoard: number;
  minItemsToLock: number;
  maxEditorsPerBoard: number;
};

export type OutfitBoardView = {
  id: string;
  title: string | null;
  status: OutfitStatus;
  visibility: OutfitVisibility;
  version: number;
  budget: number | null;
  maxItemsPerMember: number | null;
  publishedVersion: number | null;
  lastLockedVersion: number | null;
  conversationId: string | null;
  sourceConversationId: string | null;
  lockedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: OutfitViewerRole;
  members: OutfitMemberView[];
  slots: OutfitSlotView[];
  itemCount: number;
  total: number;
  isOverBudget: boolean;
  isFullyAvailable: boolean;
  isEveryoneHappy: boolean;
  limits: OutfitBoardLimitsView;
};

export type OutfitSnapshotItem = {
  slotKey: string;
  slotLabel: string;
  position: number;
  productId: string;
  productName: string;
  imageUrl: string | null;
  brandName: string;
  unitPrice: number;
};

export type OutfitPublishedView = {
  id: string;
  title: string | null;
  visibility: OutfitVisibility;
  publishedVersion: number;
  myRole: OutfitViewerRole;
  items: OutfitSnapshotItem[];
  total: number;
  contributors: OutfitPersonView[];
  lockedAt: string;
};

export type OutfitView =
  ({ kind: "board" } & OutfitBoardView) | ({ kind: "published" } & OutfitPublishedView);

export type OutfitSummaryView = {
  id: string;
  title: string | null;
  status: OutfitStatus;
  visibility: OutfitVisibility;
  version: number;
  itemCount: number;
  memberCount: number;
  previewImageUrls: string[];
  myRole: OutfitViewerRole;
  updatedAt: string;
};

export type OutfitEventView = {
  version: number;
  type: OutfitEventType;
  actorId: string | null;
  payload: unknown;
  createdAt: string;
};

export type OutfitEventsPage = {
  events: OutfitEventView[];
  currentVersion: number;
  hasMore: boolean;
};

export type OutfitActor = { id: string; name: string };
