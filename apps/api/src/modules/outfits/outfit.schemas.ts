import { OUTFIT_ITEMS_PER_MEMBER_CHOICES } from "@outfiqe/utils";
import { z } from "zod";

import { OutfitVisibility } from "#generated/prisma/enums.js";

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

export const outfitEventsQuerySchema = z.object({
  sinceVersion: z.coerce.number().int().min(MIN_VERSION),
});

export const listOutfitsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(MIN_PAGE_SIZE)
    .max(LIST_MAX_PAGE_SIZE)
    .default(LIST_DEFAULT_PAGE_SIZE),
});

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
export type OutfitEventsQuery = z.infer<typeof outfitEventsQuerySchema>;
export type ListOutfitsQuery = z.infer<typeof listOutfitsQuerySchema>;
