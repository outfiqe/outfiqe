import { z } from "zod";
import type { AdminInviteStatus } from "@outfiqe/types";

const statusValues = ["PENDING", "ACCEPTED", "EXPIRED"] satisfies AdminInviteStatus[];
export const adminInviteStatusSchema = z.enum(statusValues);

export const adminInviteSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  status: adminInviteStatusSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type AdminInviteSummary = z.infer<typeof adminInviteSummarySchema>;
