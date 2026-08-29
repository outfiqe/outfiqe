import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type Organization,
  type OrganizationCreationSuggestion,
  organizationCreationSuggestionSchema,
  organizationSchema,
} from "./schemas";

const organizationsListSchema = z.array(organizationSchema);

export const organizationsApi = {
  async list(): Promise<Organization[]> {
    const res = await apiClient.get<Organization[]>("/crm/organizations");
    return organizationsListSchema.parse(res.data);
  },

  async suggestFromBrand(brandId: string): Promise<OrganizationCreationSuggestion> {
    const res = await apiClient.get<OrganizationCreationSuggestion>("/crm/organizations/suggest", {
      params: { brandId },
    });
    return organizationCreationSuggestionSchema.parse(res.data);
  },

  async create(input: {
    name: string;
    subdomain: string;
    targetOwnerUserId: string;
    linkedBrandId: string;
  }): Promise<Organization> {
    const res = await apiClient.post<Organization>("/crm/organizations", input);
    return organizationSchema.parse(res.data);
  },
};
