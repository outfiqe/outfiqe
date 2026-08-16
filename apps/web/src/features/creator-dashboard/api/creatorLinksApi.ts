import { apiClient } from "@/shared/lib/apiClient";
import { getSessionId } from "@/shared/lib/sessionId";

import {
  type CreatorLink,
  type CreatorLinkPage,
  creatorLinkPageSchema,
  creatorLinkSchema,
  type RecordClickResult,
  recordClickResultSchema,
} from "./creatorLinksSchemas";

export const creatorLinksApi = {
  async listMine(cursor?: string): Promise<CreatorLinkPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<CreatorLinkPage>(`/creator-links/mine${params}`);
    return creatorLinkPageSchema.parse(res.data);
  },

  async createInternal(productId: string): Promise<CreatorLink> {
    const res = await apiClient.post<CreatorLink>("/creator-links/internal", { productId });
    return creatorLinkSchema.parse(res.data);
  },

  async getOrCreateExternal(productId?: string): Promise<CreatorLink> {
    const res = await apiClient.post<CreatorLink>(
      "/creator-links/external",
      productId ? { productId } : {},
    );
    return creatorLinkSchema.parse(res.data);
  },

  async recordClick(token: string): Promise<RecordClickResult> {
    const res = await apiClient.post<RecordClickResult>(`/creator-links/${token}/click`, {
      sessionId: getSessionId(),
    });
    return recordClickResultSchema.parse(res.data);
  },
};
