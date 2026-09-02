import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type CoFounderSummary,
  coFounderSummarySchema,
  type NavAccessOverview,
  navAccessOverviewSchema,
  savedHiddenNavKeysSchema,
} from "./schemas";

const candidatesSchema = z.array(coFounderSummarySchema);

export const platformNavAccessApi = {
  async getOverview(): Promise<NavAccessOverview> {
    const res = await apiClient.get<NavAccessOverview>("/platform/nav-access");
    return navAccessOverviewSchema.parse(res.data);
  },

  async listCandidates(): Promise<CoFounderSummary[]> {
    const res = await apiClient.get<CoFounderSummary[]>(
      "/platform/nav-access/co-founders/candidates",
    );
    return candidatesSchema.parse(res.data);
  },

  async setHiddenNavKeys(hiddenNavKeys: string[]): Promise<string[]> {
    const res = await apiClient.put<{ hiddenNavKeys: string[] }>("/platform/nav-access/hidden", {
      hiddenNavKeys,
    });
    return savedHiddenNavKeysSchema.parse(res.data).hiddenNavKeys;
  },

  async promoteCoFounder(membershipId: string): Promise<void> {
    await apiClient.post("/platform/nav-access/co-founders", { membershipId });
  },

  async demoteCoFounder(membershipId: string): Promise<void> {
    await apiClient.del(`/platform/nav-access/co-founders/${membershipId}`);
  },
};
