import { z } from "zod";

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  plan: z.string(),
  createdAt: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const organizationCreationSuggestionSchema = z.object({
  brandId: z.string(),
  brandName: z.string(),
  ownerUserId: z.string(),
  ownerName: z.string(),
  suggestedSubdomain: z.string(),
  ownerExistingOrganizations: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type OrganizationCreationSuggestion = z.infer<typeof organizationCreationSuggestionSchema>;
