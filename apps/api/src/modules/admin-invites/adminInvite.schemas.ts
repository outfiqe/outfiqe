import { z } from "zod";

export const createAdminInviteSchema = z.object({
  email: z.email(),
  name: z.string().min(2).max(100),
});

export type CreateAdminInviteBody = z.infer<typeof createAdminInviteSchema>;
