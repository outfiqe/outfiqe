import { RESERVED_TENANT_SUBDOMAINS, TENANT_SUBDOMAIN_REGEX } from "@outfiqe/utils";
import { z } from "zod";

const MAX_SUBDOMAIN_LENGTH = 63;

const pickedBrandSchema = z
  .object({ id: z.string(), name: z.string() })
  .nullable()
  .refine((pickedBrand): boolean => pickedBrand !== null, { message: "Choose a business." });

export const organizationFormSchema = z.object({
  brand: pickedBrandSchema,
  subdomain: z
    .string()
    .trim()
    .min(1, "Enter a subdomain.")
    .max(MAX_SUBDOMAIN_LENGTH, `Use at most ${MAX_SUBDOMAIN_LENGTH} characters.`)
    .regex(
      TENANT_SUBDOMAIN_REGEX,
      "Use lowercase letters, numbers and hyphens, without a hyphen at the start or end.",
    )
    .refine((subdomain) => !RESERVED_TENANT_SUBDOMAINS.includes(subdomain), {
      message: "This subdomain is reserved and can't be used.",
    }),
});
export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const EMPTY_ORGANIZATION_FORM: OrganizationFormValues = { brand: null, subdomain: "" };
