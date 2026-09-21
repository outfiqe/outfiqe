import { z } from "zod";

const ROLE_NAME_MIN_LENGTH = 2;
const ROLE_NAME_MAX_LENGTH = 50;
const ORGANIZATION_NAME_MIN_LENGTH = 2;
const ORGANIZATION_NAME_MAX_LENGTH = 100;

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the role.")
    .min(ROLE_NAME_MIN_LENGTH, `Use at least ${ROLE_NAME_MIN_LENGTH} characters.`)
    .max(ROLE_NAME_MAX_LENGTH, `Use at most ${ROLE_NAME_MAX_LENGTH} characters.`),
  permissionKeys: z.array(z.string()).min(1, "Choose at least one permission for this role."),
});
export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const organizationNameFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the organization.")
    .min(ORGANIZATION_NAME_MIN_LENGTH, `Use at least ${ORGANIZATION_NAME_MIN_LENGTH} characters.`)
    .max(ORGANIZATION_NAME_MAX_LENGTH, `Use at most ${ORGANIZATION_NAME_MAX_LENGTH} characters.`),
});
export type OrganizationNameFormValues = z.infer<typeof organizationNameFormSchema>;
