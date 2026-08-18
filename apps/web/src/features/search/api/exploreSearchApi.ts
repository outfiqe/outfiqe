import { apiClient } from "@/shared/lib/apiClient";

import {
  type CreatorSearchPage,
  creatorSearchPageSchema,
  type LookSearchPage,
  lookSearchPageSchema,
} from "./exploreSearchSchemas";

type SearchInput = { q: string; cursor?: string };

export const exploreSearchApi = {
  async creators({ q, cursor }: SearchInput): Promise<CreatorSearchPage> {
    const params = new URLSearchParams({ q });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<CreatorSearchPage>(`/creators/search?${params.toString()}`);
    return creatorSearchPageSchema.parse(res.data);
  },

  async posts({ q, cursor }: SearchInput): Promise<LookSearchPage> {
    const params = new URLSearchParams({ q });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<LookSearchPage>(`/creator-looks/search?${params.toString()}`);
    return lookSearchPageSchema.parse(res.data);
  },
};
