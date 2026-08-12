import { z } from "zod";

import { phoneSchema } from "#lib/phone.utils.js";

export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  phone: phoneSchema,
  password: z.string().min(8).max(200),
});

export const userIdParamSchema = z.object({
  id: z.uuid(),
});

export const updateOwnProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
  })
  .partial();

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UpdateOwnProfileBody = z.infer<typeof updateOwnProfileSchema>;
