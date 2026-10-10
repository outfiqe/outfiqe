import { z } from "zod";

export const crmInviteFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .pipe(z.email("Enter a valid email address.")),
  roleId: z.string().min(1, "Choose a role for this invite."),
});
export type CrmInviteFormValues = z.infer<typeof crmInviteFormSchema>;

export const EMPTY_CRM_INVITE_FORM: CrmInviteFormValues = { email: "", roleId: "" };
