import { z } from "zod";

export const contactLifecycleStageSchema = z.enum([
  "LEAD",
  "QUALIFIED",
  "CUSTOMER",
  "PARTNER",
  "OTHER",
]);
export type ContactLifecycleStage = z.infer<typeof contactLifecycleStageSchema>;

export const contactSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  lifecycleStage: contactLifecycleStageSchema,
  source: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  linkedUserId: z.string().nullable(),
  ownerMembershipId: z.string().nullable(),
  ownerName: z.string().nullable(),
  linkedUserName: z.string().nullable(),
  linkedUserHandle: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Contact = z.infer<typeof contactSchema>;

export const contactListPageSchema = z.object({
  items: z.array(contactSchema),
  total: z.number(),
  hasMore: z.boolean(),
});
export type ContactListPage = z.infer<typeof contactListPageSchema>;
