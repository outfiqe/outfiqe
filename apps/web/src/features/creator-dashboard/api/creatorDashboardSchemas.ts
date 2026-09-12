import { z } from "zod";

import { creatorStatusSchema } from "@/features/auth/types";

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  handle: z.string(),
  avatarUrl: z.url().nullable(),
  heightCm: z.number().nullable(),
  showHeight: z.boolean(),
  hideFromLeaderboards: z.boolean(),
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
export const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export const handleFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN_LENGTH, `Must be at least ${HANDLE_MIN_LENGTH} characters.`)
  .max(HANDLE_MAX_LENGTH, `Must be at most ${HANDLE_MAX_LENGTH} characters.`)
  .regex(HANDLE_PATTERN, "Start with a letter; only lowercase letters, numbers, and underscores.");

export const updateCreatorProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    handle: handleFieldSchema,
    avatarUrl: z.url().nullable(),
    avatarImageAssetId: z.uuid().nullable(),
    heightCm: z.number().nullable(),
    showHeight: z.boolean(),
    hideFromLeaderboards: z.boolean(),
  })
  .partial();

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileInputSchema>;

export const handleAvailabilitySchema = z.object({
  available: z.boolean(),
});

export type HandleAvailability = z.infer<typeof handleAvailabilitySchema>;
