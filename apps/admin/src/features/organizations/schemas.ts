import { z } from "zod";

const linkedOrganizationRefSchema = z.object({ id: z.string(), name: z.string() });

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  plan: z.string(),
  linkedBrandId: z.string().nullable(),
  linkedBrandName: z.string().nullable(),
  createdAt: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const organizationCreationSuggestionSchema = z.object({
  brandId: z.string(),
  brandName: z.string(),
  ownerUserId: z.string(),
  ownerName: z.string(),
  suggestedSubdomain: z.string(),
  ownerExistingOrganizations: z.array(linkedOrganizationRefSchema),
  existingOrganizationForBrand: linkedOrganizationRefSchema.nullable(),
});
export type OrganizationCreationSuggestion = z.infer<typeof organizationCreationSuggestionSchema>;
