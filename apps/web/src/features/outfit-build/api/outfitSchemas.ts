import { z } from "zod";

const outfitStatusSchema = z.enum(["DRAFT", "LOCKED", "ARCHIVED"]);
const outfitVisibilitySchema = z.enum(["PRIVATE", "SHARED", "PUBLIC"]);
const viewerRoleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);
const availabilitySchema = z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]);

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});

export const outfitProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  price: z.number(),
  listPrice: z.number(),
  productTypeId: z.string(),
  brand: z.object({ id: z.string(), name: z.string() }),
  availability: availabilitySchema,
  sizes: z.array(z.object({ label: z.string(), isInStock: z.boolean() })),
});

const outfitItemSchema = z.object({
  position: z.number(),
  product: outfitProductSchema,
  addedBy: personSchema.nullable(),
  addedAt: z.string(),
});

export const outfitSlotSchema = z.object({
  key: z.string(),
  label: z.string(),
  icon: z.string(),
  maxItems: z.number(),
  acceptsAnyProductType: z.boolean(),
  productTypeIds: z.array(z.string()),
  blocksSlotKeys: z.array(z.string()),
  isBlocked: z.boolean(),
  items: z.array(outfitItemSchema),
});

export const outfitBoardSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: outfitStatusSchema,
  visibility: outfitVisibilitySchema,
  version: z.number(),
  budget: z.number().nullable(),
  maxItemsPerMember: z.number().nullable(),
  publishedVersion: z.number().nullable(),
  lastLockedVersion: z.number().nullable(),
  conversationId: z.string().nullable(),
  sourceConversationId: z.string().nullable(),
  lockedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  myRole: viewerRoleSchema,
  members: z.array(
    z.object({
      user: personSchema,
      role: z.enum(["OWNER", "EDITOR"]),
      isHappy: z.boolean(),
      joinedAt: z.string(),
      canReceiveOffers: z.boolean(),
    }),
  ),
  slots: z.array(outfitSlotSchema),
  itemCount: z.number(),
  total: z.number(),
  isOverBudget: z.boolean(),
  isFullyAvailable: z.boolean(),
  isEveryoneHappy: z.boolean(),
  limits: z.object({
    maxItemsPerBoard: z.number(),
    minItemsToLock: z.number(),
    maxEditorsPerBoard: z.number(),
  }),
});

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

export const outfitPublishedSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  visibility: outfitVisibilitySchema,
  publishedVersion: z.number(),
  myRole: viewerRoleSchema,
  items: z.array(snapshotItemSchema),
  total: z.number(),
  contributors: z.array(personSchema),
  lockedAt: z.string(),
});

export const outfitViewSchema = z.discriminatedUnion("kind", [
  outfitBoardSchema.extend({ kind: z.literal("board") }),
  outfitPublishedSchema.extend({ kind: z.literal("published") }),
]);

export const outfitReplacementsSchema = z.object({ products: z.array(outfitProductSchema) });

export const myBuildLookSchema = z
  .object({
    lookId: z.string(),
    publishedVersion: z.number(),
    lastLockedVersion: z.number().nullable(),
    isOutdated: z.boolean(),
  })
  .nullable();

export const publishedLookSchema = z.object({ id: z.string() });

export const BUILD_ITEM_LEFT_OUT_REASONS = [
  "NOT_IN_BUILD",
  "NO_LONGER_SOLD",
  "NO_SIZE_CHOSEN",
  "SIZE_NOT_OFFERED",
  "SOLD_OUT",
] as const;

export const buildCartResultSchema = z.object({
  addedProductIds: z.array(z.string()),
  leftOut: z.array(
    z.object({ productId: z.string(), reason: z.enum(BUILD_ITEM_LEFT_OUT_REASONS) }),
  ),
});

export const outfitWriteResultSchema = z.object({
  version: z.number(),
  board: outfitBoardSchema.nullable(),
});

export const outfitSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: outfitStatusSchema,
  visibility: outfitVisibilitySchema,
  version: z.number(),
  itemCount: z.number(),
  memberCount: z.number(),
  previewImageUrls: z.array(z.string()),
  myRole: viewerRoleSchema,
  updatedAt: z.string(),
});

export const outfitSummaryPageSchema = z.object({
  items: z.array(outfitSummarySchema),
  nextCursor: z.string().nullable(),
});

export const outfitEventsPageSchema = z.object({
  events: z.array(
    z.object({
      version: z.number(),
      type: z.string(),
      actorId: z.string().nullable(),
      payload: z.unknown(),
      createdAt: z.string(),
    }),
  ),
  currentVersion: z.number(),
  hasMore: z.boolean(),
});

export type OutfitBoard = z.infer<typeof outfitBoardSchema>;
export type OutfitSlot = z.infer<typeof outfitSlotSchema>;
export type OutfitProduct = z.infer<typeof outfitProductSchema>;
export type MyBuildLook = z.infer<typeof myBuildLookSchema>;
export type PublishedLook = z.infer<typeof publishedLookSchema>;
export type BuildCartResult = z.infer<typeof buildCartResultSchema>;
export type OutfitPublished = z.infer<typeof outfitPublishedSchema>;
export type OutfitView = z.infer<typeof outfitViewSchema>;
export type OutfitWriteResult = z.infer<typeof outfitWriteResultSchema>;
export type OutfitSummary = z.infer<typeof outfitSummarySchema>;
export type OutfitSummaryPage = z.infer<typeof outfitSummaryPageSchema>;
export type OutfitEventsPage = z.infer<typeof outfitEventsPageSchema>;
export type OutfitVisibility = z.infer<typeof outfitVisibilitySchema>;
