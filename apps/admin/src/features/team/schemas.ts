import type { AdminInviteStatus } from "@outfiqe/types";
import { z } from "zod";

const statusValues = ["PENDING", "ACCEPTED", "EXPIRED"] satisfies AdminInviteStatus[];
export const adminInviteStatusSchema = z.enum(statusValues);

export const adminInviteSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  status: adminInviteStatusSchema,
  isCoFounder: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type AdminInviteSummary = z.infer<typeof adminInviteSummarySchema>;
