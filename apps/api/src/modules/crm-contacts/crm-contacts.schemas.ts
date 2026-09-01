import { z } from "zod";

import { ContactLifecycleStage } from "#generated/prisma/enums.js";

import { MAX_CONTACT_TAGS, MAX_CONTACTS_PAGE_SIZE } from "./crm-contacts.constants.js";

const lifecycleStageSchema = z.enum(ContactLifecycleStage);
const emailField = z.email().max(200);
const shortText = z.string().trim().min(1).max(140);
const tagsField = z.array(z.string().trim().min(1).max(40)).max(MAX_CONTACT_TAGS);

export const createContactSchema = z.object({
  name: shortText,
  email: emailField.nullable().optional().default(null),
  phone: z.string().trim().min(1).max(40).nullable().optional().default(null),
  company: shortText.nullable().optional().default(null),
  jobTitle: shortText.nullable().optional().default(null),
  lifecycleStage: lifecycleStageSchema.optional().default(ContactLifecycleStage.LEAD),
  source: z.string().trim().min(1).max(80).nullable().optional().default(null),
  tags: tagsField.optional().default([]),
  notes: z.string().trim().min(1).max(5000).nullable().optional().default(null),
  linkedUserId: z.uuid().nullable().optional().default(null),
  ownerMembershipId: z.uuid().nullable().optional().default(null),
});

export const updateContactSchema = z
  .object({
    name: shortText.optional(),
    email: emailField.nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    company: shortText.nullable().optional(),
    jobTitle: shortText.nullable().optional(),
    lifecycleStage: lifecycleStageSchema.optional(),
    source: z.string().trim().min(1).max(80).nullable().optional(),
    tags: tagsField.optional(),
    notes: z.string().trim().min(1).max(5000).nullable().optional(),
    linkedUserId: z.uuid().nullable().optional(),
    ownerMembershipId: z.uuid().nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update.",
  });

export const contactListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  lifecycleStage: lifecycleStageSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_CONTACTS_PAGE_SIZE).optional(),
});

export const contactIdParamsSchema = z.object({ contactId: z.uuid() });

export type CreateContactBody = z.infer<typeof createContactSchema>;
export type UpdateContactBody = z.infer<typeof updateContactSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactIdParams = z.infer<typeof contactIdParamsSchema>;
