import { z } from "zod";

const ROLE_NAME_MIN_LENGTH = 2;
const ROLE_NAME_MAX_LENGTH = 50;

export const platformRoleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the role.")
    .min(ROLE_NAME_MIN_LENGTH, `Use at least ${ROLE_NAME_MIN_LENGTH} characters.`)
    .max(ROLE_NAME_MAX_LENGTH, `Use at most ${ROLE_NAME_MAX_LENGTH} characters.`),
  permissionKeys: z.array(z.string()).min(1, "Choose at least one permission."),
});
export type PlatformRoleFormValues = z.infer<typeof platformRoleFormSchema>;
