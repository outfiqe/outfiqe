import { apiClient } from "@/lib/apiClient";

import {
  type Organization,
  type OrganizationCreationSuggestion,
  organizationCreationSuggestionSchema,
  type OrganizationListPage,
  organizationListPageSchema,
  organizationSchema,
} from "./schemas";

export const organizationsApi = {
  async list(cursor?: string): Promise<OrganizationListPage> {
    const res = await apiClient.get<OrganizationListPage>("/crm/organizations", {
      params: cursor ? { cursor } : undefined,
    });
    return organizationListPageSchema.parse(res.data);
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
