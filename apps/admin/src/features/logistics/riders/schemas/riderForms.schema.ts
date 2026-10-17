import { z } from "zod";

import { identityDocumentTypeSchema, riderEmploymentTypeSchema } from "../api/ridersSchemas";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const DOCUMENT_LAST4_PATTERN = /^[A-Za-z0-9]{4}$/;

export const inviteRiderFormSchema = z.object({
  name: z.string().trim().min(MIN_NAME_LENGTH, "Enter the rider's name.").max(MAX_NAME_LENGTH),
  email: z.email("Enter a valid email."),
  employmentType: riderEmploymentTypeSchema,
});
export type InviteRiderFormValues = z.infer<typeof inviteRiderFormSchema>;

export const identityCheckFormSchema = z.object({
  documentType: identityDocumentTypeSchema,
  documentLast4: z
    .string()
    .trim()
    .regex(DOCUMENT_LAST4_PATTERN, "Enter the last 4 letters or digits on the document."),
});
export type IdentityCheckFormValues = z.infer<typeof identityCheckFormSchema>;
