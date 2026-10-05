import type {
  CommissionScope,
  OutfitEventType,
  OutfitMemberRole,
  OutfitPhotoKind,
  OutfitPhotoStatus,
  OutfitStatus,
  OutfitVisibility,
} from "#generated/prisma/enums.js";
import type { OutfitPersonView, OutfitSnapshotItem } from "#modules/outfits/outfit.types.js";

export type AdminBuildSummary = {
  id: string;
  title: string | null;
  status: OutfitStatus;
  visibility: OutfitVisibility;
  version: number;
  owner: OutfitPersonView | null;
  memberCount: number;
  itemCount: number;
  photoCount: number;
  likeCount: number;
  commentCount: number;
  isStartedInChat: boolean;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminBuildPage = { items: AdminBuildSummary[]; nextCursor: string | null };

export type AdminBuildItem = {
  slotLabel: string;
  position: number;
  productId: string;
  productName: string;
  imageUrl: string | null;
  price: number;
  addedBy: OutfitPersonView | null;
};

export type AdminBuildVersion = {
  version: number;
  total: number;
  itemCount: number;
  lockedAt: string;
};

export type AdminBuildLook = {
  id: string;
  creator: OutfitPersonView;
  sourceVersion: number;
  isDeleted: boolean;
  createdAt: string;
};

export type AdminBuildPhoto = {
  id: string;
  kind: OutfitPhotoKind;
  status: OutfitPhotoStatus;
  imageUrl: string;
  uploadedBy: OutfitPersonView | null;
  coverPosition: number | null;
  createdAt: string;
};

export type AdminBuildDetail = AdminBuildSummary & {
  budget: number | null;
  publishedVersion: number | null;
  lockedAt: string | null;
  archivedAt: string | null;
  members: {
    user: OutfitPersonView;
    role: OutfitMemberRole;
    isHappy: boolean;
    joinedAt: string;
  }[];
  items: AdminBuildItem[];
  versions: AdminBuildVersion[];
  publishedItems: OutfitSnapshotItem[];
  looks: AdminBuildLook[];
  photos: AdminBuildPhoto[];
  openReportCount: number;
};

export type AdminBuildEvent = {
  version: number;
  type: OutfitEventType;
  actor: OutfitPersonView | null;
  payload: unknown;
  createdAt: string;
};

export type AdminBuildHistoryPage = {
  events: AdminBuildEvent[];
  nextBeforeVersion: number | null;
};

export type BuildMetricsWeek = {
  weekStart: string;
  buildsStartedAlone: number;
  buildsStartedFromChat: number;
  buildsLocked: number;
  buildsMadePublic: number;
  comments: number;
  likes: number;
  saves: number;
  fullSetOrders: number;
  pickedItemOrders: number;
};

export type CommissionTierUsage = {
  scope: CommissionScope;
  tierId: string;
  minPrice: number;
  maxPrice: number | null;
  amount: number;
  commissionCount: number;
  totalAmount: number;
};

export type BuildMetrics = {
  weeks: BuildMetricsWeek[];
  sharedBuildCount: number;
  publicBuildCount: number;
  commissionByTier: CommissionTierUsage[];
};
