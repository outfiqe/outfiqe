import { apiClient } from "@/shared/lib/apiClient";

import {
  type CreatorSearchPage,
  creatorSearchPageSchema,
  type CreatorSuggestion,
  creatorSuggestionSchema,
  type LookSearchPage,
  lookSearchPageSchema,
  type PostSuggestion,
  postSuggestionSchema,
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

  async autocompleteCreators(q: string): Promise<CreatorSuggestion[]> {
    const res = await apiClient.get<CreatorSuggestion[]>(
      `/creators/autocomplete?q=${encodeURIComponent(q)}`,
    );
    return creatorSuggestionSchema.array().parse(res.data);
  },

  async autocompletePosts(q: string): Promise<PostSuggestion[]> {
    const res = await apiClient.get<PostSuggestion[]>(
      `/creator-looks/autocomplete?q=${encodeURIComponent(q)}`,
    );
    return postSuggestionSchema.array().parse(res.data);
  },
};
