import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

export const userSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});
export type UserSearchResult = z.infer<typeof userSearchResultSchema>;

const userSearchResultListSchema = z.array(userSearchResultSchema);

export const usersApi = {
  async search(q: string): Promise<UserSearchResult[]> {
    const res = await apiClient.get<UserSearchResult[]>("/users/search", { params: { q } });
    return userSearchResultListSchema.parse(res.data);
  },
};
