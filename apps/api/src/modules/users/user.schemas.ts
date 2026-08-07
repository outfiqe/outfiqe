import { z } from "zod";

// Schemas live next to the module they belong to, and are the single
// source of truth for both validation and inferred input types.
export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
});

export const userIdParamSchema = z.object({
  id: z.uuid(),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
