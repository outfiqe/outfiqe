import { apiClient } from "@/shared/lib/apiClient";

import { type CreatorCompetition, creatorCompetitionListSchema } from "./creatorCompetitionSchemas";

export const creatorCompetitionApi = {
  async listActive(): Promise<CreatorCompetition[]> {
    const res = await apiClient.get<CreatorCompetition[]>("/creator-competitions");
    return creatorCompetitionListSchema.parse(res.data);
  },
};
