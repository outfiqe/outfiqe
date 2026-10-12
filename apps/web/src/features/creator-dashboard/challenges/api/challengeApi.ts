import { apiClient } from "@/shared/lib/apiClient";

import { type PublicChallenge, publicChallengeListSchema } from "./challengeSchemas";

export const challengeApi = {
  async listActive(): Promise<PublicChallenge[]> {
    const res = await apiClient.get<PublicChallenge[]>("/challenges");
    return publicChallengeListSchema.parse(res.data);
  },
};
