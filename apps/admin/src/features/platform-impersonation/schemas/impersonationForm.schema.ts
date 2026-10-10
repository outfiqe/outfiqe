import { z } from "zod";

import { optionalWholeNumberText } from "@/lib/formFields";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 60;

export const impersonationFormSchema = z.object({
  organizationId: z.string().min(1, "Pick a tenant."),
  targetUserId: z.string().min(1, "Pick a member to act as."),
  reason: z
    .string()
    .trim()
    .min(1, "Enter a reason for the audit trail.")
    .min(MIN_REASON_LENGTH, `Use at least ${MIN_REASON_LENGTH} characters.`)
    .max(MAX_REASON_LENGTH, `Use at most ${MAX_REASON_LENGTH} characters.`),
  scope: z.enum(["read", "write"]),
  ttlMinutes: optionalWholeNumberText().refine(
    (raw) => raw === "" || (Number(raw) >= MIN_TTL_MINUTES && Number(raw) <= MAX_TTL_MINUTES),
    { message: `Use a number from ${MIN_TTL_MINUTES} to ${MAX_TTL_MINUTES} minutes.` },
  ),
});
export type ImpersonationFormValues = z.infer<typeof impersonationFormSchema>;

export const EMPTY_IMPERSONATION_FORM: ImpersonationFormValues = {
  organizationId: "",
  targetUserId: "",
  reason: "",
  scope: "read",
  ttlMinutes: "",
};
