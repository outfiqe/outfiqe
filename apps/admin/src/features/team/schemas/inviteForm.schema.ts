import { z } from "zod";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

export const inviteFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the person's name.")
    .min(NAME_MIN_LENGTH, `Use at least ${NAME_MIN_LENGTH} characters.`)
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters.`),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .pipe(z.email("Enter a valid email address.")),
  roleId: z.string().min(1, "Choose a platform role for this invite."),
});
export type InviteFormValues = z.infer<typeof inviteFormSchema>;

export const EMPTY_INVITE_FORM: InviteFormValues = { name: "", email: "", roleId: "" };
