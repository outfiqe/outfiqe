import { z } from "zod";

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

export const handleAvailabilitySchema = z.object({
  available: z.boolean(),
});

export type HandleAvailability = z.infer<typeof handleAvailabilitySchema>;

export const updateOwnProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    handle: handleFieldSchema,
    avatarUrl: z.url().nullable(),
    avatarImageAssetId: z.uuid().nullable(),
  })
  .partial();

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileInputSchema>;

export const ownProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.url().nullable(),
});

export type OwnProfile = z.infer<typeof ownProfileSchema>;
