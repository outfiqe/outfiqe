import { z } from "zod";

export const BUILD_STATUSES = ["DRAFT", "LOCKED", "ARCHIVED"] as const;
export const BUILD_VISIBILITIES = ["PRIVATE", "SHARED", "PUBLIC"] as const;

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});

export const adminBuildSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: z.enum(BUILD_STATUSES),
  visibility: z.enum(BUILD_VISIBILITIES),
  version: z.number(),
  owner: personSchema.nullable(),
  memberCount: z.number(),
  itemCount: z.number(),
  photoCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number(),
  isStartedInChat: z.boolean(),
  removedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminBuildPageSchema = z.object({
  items: z.array(adminBuildSummarySchema),
  nextCursor: z.string().nullable(),
});

export const adminBuildDetailSchema = adminBuildSummarySchema.extend({
  budget: z.number().nullable(),
  publishedVersion: z.number().nullable(),
  lockedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  members: z.array(
    z.object({
      user: personSchema,
      role: z.enum(["OWNER", "EDITOR"]),
      isHappy: z.boolean(),
      joinedAt: z.string(),
    }),
  ),
  items: z.array(
    z.object({
      slotLabel: z.string(),
      position: z.number(),
      productId: z.string(),
      productName: z.string(),
      imageUrl: z.string().nullable(),
      price: z.number(),
      addedBy: personSchema.nullable(),
    }),
  ),
  versions: z.array(
    z.object({
      version: z.number(),
      total: z.number(),
      itemCount: z.number(),
      lockedAt: z.string(),
    }),
  ),
  publishedItems: z.array(
    z.object({
      slotLabel: z.string(),
      position: z.number(),
      productId: z.string(),
      productName: z.string(),
      imageUrl: z.string().nullable(),
      brandName: z.string(),
      unitPrice: z.number(),
    }),
  ),
  looks: z.array(
    z.object({
      id: z.string(),
      creator: personSchema,
      sourceVersion: z.number(),
      isDeleted: z.boolean(),
      createdAt: z.string(),
    }),
  ),
  photos: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["COVER", "TRY_ON"]),
      status: z.enum(["PROCESSING", "READY", "REMOVED"]),
      imageUrl: z.string(),
      uploadedBy: personSchema.nullable(),
      coverPosition: z.number().nullable(),
      createdAt: z.string(),
    }),
  ),
  openReportCount: z.number(),
});

export const adminBuildHistoryPageSchema = z.object({
  events: z.array(
    z.object({
      version: z.number(),
      type: z.string(),
      actor: personSchema.nullable(),
      payload: z.unknown(),
      createdAt: z.string(),
    }),
  ),
  nextBeforeVersion: z.number().nullable(),
});

export const buildMetricsSchema = z.object({
  weeks: z.array(
    z.object({
      weekStart: z.string(),
      buildsStartedAlone: z.number(),
      buildsStartedFromChat: z.number(),
      buildsLocked: z.number(),
      buildsMadePublic: z.number(),
      comments: z.number(),
      likes: z.number(),
      saves: z.number(),
      fullSetOrders: z.number(),
      pickedItemOrders: z.number(),
    }),
  ),
  sharedBuildCount: z.number(),
  publicBuildCount: z.number(),
  commissionByTier: z.array(
    z.object({
      scope: z.enum(["CREATOR_LOOK", "OUTFIT_BUILD"]),
      tierId: z.string(),
      minPrice: z.number(),
      maxPrice: z.number().nullable(),
      amount: z.number(),
      commissionCount: z.number(),
      totalAmount: z.number(),
    }),
  ),
});

export type AdminBuildSummary = z.infer<typeof adminBuildSummarySchema>;
export type AdminBuildPage = z.infer<typeof adminBuildPageSchema>;
export type AdminBuildDetail = z.infer<typeof adminBuildDetailSchema>;
export type AdminBuildHistoryPage = z.infer<typeof adminBuildHistoryPageSchema>;
export type BuildMetrics = z.infer<typeof buildMetricsSchema>;
export type BuildStatus = AdminBuildSummary["status"];
export type BuildVisibility = AdminBuildSummary["visibility"];
export type AdminBuildFilter = {
  search?: string;
  status?: BuildStatus;
  visibility?: BuildVisibility;
};
export type AdminBuildAction = "unlock" | "archive";
