import { z } from "zod";

import { handleField } from "#lib/handle.schemas.js";
import { phoneSchema } from "#lib/phone.utils.js";

const DEFAULT_LIST_USERS_PAGE_SIZE = 20;
const MAX_LIST_USERS_PAGE_SIZE = 50;

export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_USERS_PAGE_SIZE)
    .default(DEFAULT_LIST_USERS_PAGE_SIZE),
});

export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  phone: phoneSchema,
  password: z.string().min(8).max(200),
});

export const userIdParamSchema = z.object({
  id: z.uuid(),
});

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const updateOwnProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    avatarUrl: z.url().nullable(),
  })
  .partial();

export const handleAvailabilityQuerySchema = z.object({
  handle: handleField,
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
export type UpdateOwnProfileBody = z.infer<typeof updateOwnProfileSchema>;
export type HandleAvailabilityQuery = z.infer<typeof handleAvailabilityQuerySchema>;
