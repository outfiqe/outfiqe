import { OUTFIT_ITEMS_PER_MEMBER_CHOICES } from "@outfiqe/utils";
import { z } from "zod";

import { OutfitPhotoKind, OutfitVisibility } from "#generated/prisma/enums.js";
import {
  hasAlignedImageAssetIds,
  IMAGE_ASSET_ALIGNMENT_ISSUE,
  lookContentSchema,
  taggedProductsSchema,
} from "#modules/creator-looks/creatorLook.schemas.js";
import { PLATFORM_SETTING_REGISTRY } from "#modules/platform-settings/platform-settings.registry.js";

import { OUTFIT_LIMITS } from "./outfit.constants.js";

const {
  TITLE_MAX_LENGTH,
  BUDGET_MAX,
  EDITORS_PER_REQUEST_MAX,
  SHARES_PER_REQUEST_MAX,
  LIST_DEFAULT_PAGE_SIZE,
  LIST_MAX_PAGE_SIZE,
} = OUTFIT_LIMITS;

const MIN_TITLE_LENGTH = 1;
const MIN_BUDGET = 0;
const MIN_VERSION = 0;
const MIN_PAGE_SIZE = 1;
const MIN_SLOT_POSITION = 0;
const SLOT_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const hasNoDuplicates = (ids: string[]) => new Set(ids).size === ids.length;

const uniqueUserIdsSchema = (maxLength: number) =>
  z
    .array(z.uuid())
    .min(1)
    .max(maxLength)
    .refine(hasNoDuplicates, { message: "List each person only once." });

const titleSchema = z.string().trim().min(MIN_TITLE_LENGTH).max(TITLE_MAX_LENGTH);

const itemsPerMemberSchema = z
  .number()
  .int()
  .refine(
    (limit) => OUTFIT_ITEMS_PER_MEMBER_CHOICES.some((choice) => choice === limit),
    "Choose 1, 2 or 3 items per person.",
  );

export const outfitIdParamSchema = z.object({ id: z.uuid() });

export const outfitMemberParamSchema = z.object({ id: z.uuid(), userId: z.uuid() });

export const outfitSlotParamSchema = z.object({
  id: z.uuid(),
  slotKey: z.string().regex(SLOT_KEY_PATTERN),
});

export const outfitSlotPositionParamSchema = outfitSlotParamSchema.extend({
  position: z.coerce.number().int().min(MIN_SLOT_POSITION),
});

export const createOutfitSchema = z
  .object({
    title: titleSchema.optional(),
    sourceConversationId: z.uuid().optional(),
  })
  .strict();

export const placeItemSchema = z.object({ productId: z.uuid() }).strict();

export const reorderSlotSchema = z
  .object({
    productIds: z
      .array(z.uuid())
      .min(1)
      .refine(hasNoDuplicates, { message: "List each product only once." }),
  })
  .strict();

export const updateOutfitSettingsSchema = z
  .object({
    title: titleSchema.nullable().optional(),
    budget: z.number().int().min(MIN_BUDGET).max(BUDGET_MAX).nullable().optional(),
    maxItemsPerMember: itemsPerMemberSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Change at least one setting." });

export const setHappySchema = z.object({ isHappy: z.boolean() }).strict();

export const addEditorsSchema = z
  .object({ userIds: uniqueUserIdsSchema(EDITORS_PER_REQUEST_MAX) })
  .strict();

export const transferOwnershipSchema = z.object({ userId: z.uuid() }).strict();

export const setVisibilitySchema = z
  .object({
    visibility: z.enum(OutfitVisibility),
    shareWithUserIds: uniqueUserIdsSchema(SHARES_PER_REQUEST_MAX).optional(),
  })
  .strict()
  .refine((body) => !body.shareWithUserIds || body.visibility === OutfitVisibility.SHARED, {
    message: "Only a shared build can be sent to people.",
    path: ["shareWithUserIds"],
  });

export const publishLookSchema = lookContentSchema
  .extend({ sizesWorn: taggedProductsSchema })
  .strict()
  .refine(hasAlignedImageAssetIds, IMAGE_ASSET_ALIGNMENT_ISSUE)
  .refine(
    ({ sizesWorn }) =>
      new Set(sizesWorn.map(({ productId }) => productId)).size === sizesWorn.length,
    { message: "Each item can only have one size.", path: ["sizesWorn"] },
  );

const MAX_BUILD_CART_LINES = 30;
const MAX_SIZE_LABEL_LENGTH = 20;

export const addBuildToCartSchema = z
  .object({
    isFullSet: z.boolean(),
    sizes: z
      .array(
        z.object({
          productId: z.uuid(),
          sizeLabel: z.string().trim().min(1).max(MAX_SIZE_LABEL_LENGTH),
        }),
      )
      .max(MAX_BUILD_CART_LINES),
  })
  .strict()
  .refine(({ sizes }) => new Set(sizes.map(({ productId }) => productId)).size === sizes.length, {
    message: "Each item can only have one size.",
    path: ["sizes"],
  });

export const outfitEventsQuerySchema = z.object({
  sinceVersion: z.coerce.number().int().min(MIN_VERSION),
});

const CATEGORY_SLUG_MAX_LENGTH = 80;
const COMMENT_BODY_MAX_LENGTH = 1000;
const MIN_PRICE = 0;
const TRUE_TEXT = "true";
const FALSE_TEXT = "false";

export const publicBuildsQuerySchema = z
  .object({
    category: z.string().trim().min(MIN_TITLE_LENGTH).max(CATEGORY_SLUG_MAX_LENGTH).optional(),
    minPrice: z.coerce.number().int().min(MIN_PRICE).optional(),
    maxPrice: z.coerce.number().int().min(MIN_PRICE).optional(),
    inStockOnly: z
      .enum([TRUE_TEXT, FALSE_TEXT])
      .optional()
      .transform((value) => value === TRUE_TEXT),
    contributorId: z.uuid().optional(),
    brandId: z.uuid().optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(MIN_PAGE_SIZE)
      .max(LIST_MAX_PAGE_SIZE)
      .default(LIST_DEFAULT_PAGE_SIZE),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: "The lowest price can't be above the highest.", path: ["minPrice"] },
  );

export const outfitCommentParamSchema = z.object({ id: z.uuid(), commentId: z.uuid() });

export const addOutfitCommentSchema = z
  .object({
    body: z.string().trim().min(MIN_TITLE_LENGTH).max(COMMENT_BODY_MAX_LENGTH),
    parentCommentId: z.uuid().optional(),
  })
  .strict();

export const listOutfitsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(MIN_PAGE_SIZE)
    .max(LIST_MAX_PAGE_SIZE)
    .default(LIST_DEFAULT_PAGE_SIZE),
});

const PHOTOS_PER_REQUEST_MAX = PLATFORM_SETTING_REGISTRY["outfit.maxPhotosPerMember"].maximum;
const COVER_PHOTOS_MAX = PLATFORM_SETTING_REGISTRY["outfit.maxCoverPhotos"].maximum;

export const outfitPhotoParamSchema = z.object({ id: z.uuid(), photoId: z.uuid() });

export const addOutfitPhotosSchema = z.object({
  kind: z.enum(OutfitPhotoKind),
  photos: z
    .array(z.object({ imageUrl: z.url(), imageAssetId: z.uuid() }))
    .min(1)
    .max(PHOTOS_PER_REQUEST_MAX)
    .refine((photos) => hasNoDuplicates(photos.map(({ imageAssetId }) => imageAssetId)), {
      message: "Add each photo only once.",
    }),
});

export const setOutfitCoversSchema = z.object({
  photoIds: z
    .array(z.uuid())
    .max(COVER_PHOTOS_MAX)
    .refine(hasNoDuplicates, { message: "Pick each photo only once." }),
});

export type OutfitPhotoParam = z.infer<typeof outfitPhotoParamSchema>;
export type AddOutfitPhotosBody = z.infer<typeof addOutfitPhotosSchema>;
export type SetOutfitCoversBody = z.infer<typeof setOutfitCoversSchema>;
export type OutfitIdParam = z.infer<typeof outfitIdParamSchema>;
export type OutfitMemberParam = z.infer<typeof outfitMemberParamSchema>;
export type OutfitSlotParam = z.infer<typeof outfitSlotParamSchema>;
export type OutfitSlotPositionParam = z.infer<typeof outfitSlotPositionParamSchema>;
export type CreateOutfitBody = z.infer<typeof createOutfitSchema>;
export type PlaceItemBody = z.infer<typeof placeItemSchema>;
export type ReorderSlotBody = z.infer<typeof reorderSlotSchema>;
export type UpdateOutfitSettingsBody = z.infer<typeof updateOutfitSettingsSchema>;
export type SetHappyBody = z.infer<typeof setHappySchema>;
export type AddEditorsBody = z.infer<typeof addEditorsSchema>;
export type TransferOwnershipBody = z.infer<typeof transferOwnershipSchema>;
export type SetVisibilityBody = z.infer<typeof setVisibilitySchema>;
export type PublishLookBody = z.infer<typeof publishLookSchema>;
export type AddBuildToCartBody = z.infer<typeof addBuildToCartSchema>;
export type PublicBuildsQuery = z.infer<typeof publicBuildsQuerySchema>;
export type OutfitCommentParam = z.infer<typeof outfitCommentParamSchema>;
export type AddOutfitCommentBody = z.infer<typeof addOutfitCommentSchema>;
export type OutfitEventsQuery = z.infer<typeof outfitEventsQuerySchema>;
export type ListOutfitsQuery = z.infer<typeof listOutfitsQuerySchema>;
