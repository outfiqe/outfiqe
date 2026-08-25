import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { type Organization, organizationSchema } from "./schemas";

const organizationsListSchema = z.array(organizationSchema);

export const organizationsApi = {
  async list(): Promise<Organization[]> {
    const res = await apiClient.get<Organization[]>("/crm/organizations");
    return organizationsListSchema.parse(res.data);
  },

  async create(name: string, subdomain: string): Promise<Organization> {
    const res = await apiClient.post<Organization>("/crm/organizations", { name, subdomain });
    return organizationSchema.parse(res.data);
  },
};
