import { IDEMPOTENCY_HEADER } from "@outfiqe/client";

import { apiClient } from "@/shared/lib/apiClient";

import {
  type MyBuildLook,
  myBuildLookSchema,
  type OutfitBoard,
  outfitBoardSchema,
  type OutfitEventsPage,
  outfitEventsPageSchema,
  type OutfitProduct,
  outfitReplacementsSchema,
  type OutfitSummaryPage,
  outfitSummaryPageSchema,
  type OutfitView,
  outfitViewSchema,
  type OutfitVisibility,
  type OutfitWriteResult,
  outfitWriteResultSchema,
  type PublishedLook,
  publishedLookSchema,
} from "./outfitSchemas";

const IF_MATCH_HEADER = "If-Match";

export type PublishLookInput = {
  imageUrls: string[];
  imageAssetIds?: (string | null)[];
  caption?: string;
  sizesWorn: { productId: string; sizeWorn: string }[];
};

export type OutfitWrite = {
  outfitId: string;
  expectedVersion: number;
  idempotencyKey: string;
};

const writeHeaders = ({ expectedVersion, idempotencyKey }: OutfitWrite) => ({
  headers: {
    [IF_MATCH_HEADER]: `"${expectedVersion}"`,
    [IDEMPOTENCY_HEADER]: idempotencyKey,
  },
});

const slotPositionPath = (outfitId: string, slotKey: string, position: number) =>
  `/outfits/${outfitId}/slots/${slotKey}/positions/${position}`;

const parseWrite = (data: unknown): OutfitWriteResult => outfitWriteResultSchema.parse(data);

export const outfitApi = {
  async start(
    input: { title?: string; sourceConversationId?: string },
    idempotencyKey: string,
  ): Promise<OutfitBoard> {
    const res = await apiClient.post<OutfitBoard>("/outfits", input, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return outfitBoardSchema.parse(res.data);
  },

  async get(outfitId: string): Promise<OutfitView> {
    const res = await apiClient.get<OutfitView>(`/outfits/${outfitId}`);
    return outfitViewSchema.parse(res.data);
  },

  async listMine(cursor?: string): Promise<OutfitSummaryPage> {
    const res = await apiClient.get<OutfitSummaryPage>("/outfits", { params: { cursor } });
    return outfitSummaryPageSchema.parse(res.data);
  },

  async listSharedWithMe(cursor?: string): Promise<OutfitSummaryPage> {
    const res = await apiClient.get<OutfitSummaryPage>("/outfits/shared-with-me", {
      params: { cursor },
    });
    return outfitSummaryPageSchema.parse(res.data);
  },

  async listEvents(outfitId: string, sinceVersion: number): Promise<OutfitEventsPage> {
    const res = await apiClient.get<OutfitEventsPage>(`/outfits/${outfitId}/events`, {
      params: { sinceVersion },
    });
    return outfitEventsPageSchema.parse(res.data);
  },

  async getMyLook(outfitId: string): Promise<MyBuildLook> {
    const res = await apiClient.get(`/outfits/${outfitId}/look`);
    return myBuildLookSchema.parse(res.data);
  },

  async publishLook(outfitId: string, input: PublishLookInput): Promise<{ look: PublishedLook }> {
    const res = await apiClient.post(`/outfits/${outfitId}/look`, input);
    return { look: publishedLookSchema.parse(res.data) };
  },

  async listReplacements(
    outfitId: string,
    slotKey: string,
    position: number,
  ): Promise<OutfitProduct[]> {
    const res = await apiClient.get(
      `${slotPositionPath(outfitId, slotKey, position)}/replacements`,
    );
    return outfitReplacementsSchema.parse(res.data).products;
  },

  async placeItem(
    write: OutfitWrite,
    slotKey: string,
    position: number,
    productId: string,
  ): Promise<OutfitWriteResult> {
    const res = await apiClient.put(
      slotPositionPath(write.outfitId, slotKey, position),
      { productId },
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async removeItem(write: OutfitWrite, slotKey: string, position: number) {
    const res = await apiClient.del(
      slotPositionPath(write.outfitId, slotKey, position),
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async reorderSlot(write: OutfitWrite, slotKey: string, productIds: string[]) {
    const res = await apiClient.put(
      `/outfits/${write.outfitId}/slots/${slotKey}/order`,
      { productIds },
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async updateSettings(
    write: OutfitWrite,
    changes: { title?: string | null; budget?: number | null; maxItemsPerMember?: number | null },
  ) {
    const res = await apiClient.patch(
      `/outfits/${write.outfitId}/settings`,
      changes,
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async setHappy(write: OutfitWrite, isHappy: boolean) {
    const res = await apiClient.put(
      `/outfits/${write.outfitId}/happy`,
      { isHappy },
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async runOwnerAction(write: OutfitWrite, action: "lock" | "unlock" | "archive") {
    const res = await apiClient.post(
      `/outfits/${write.outfitId}/${action}`,
      undefined,
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async addEditors(write: OutfitWrite, userIds: string[]) {
    const res = await apiClient.post(
      `/outfits/${write.outfitId}/members`,
      { userIds },
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async removeEditor(write: OutfitWrite, userId: string) {
    const res = await apiClient.del(
      `/outfits/${write.outfitId}/members/${userId}`,
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async leave(write: OutfitWrite) {
    const res = await apiClient.post(
      `/outfits/${write.outfitId}/leave`,
      undefined,
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async transferOwnership(write: OutfitWrite, userId: string) {
    const res = await apiClient.post(
      `/outfits/${write.outfitId}/transfer-ownership`,
      { userId },
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },

  async setVisibility(
    write: OutfitWrite,
    visibility: OutfitVisibility,
    shareWithUserIds?: string[],
  ) {
    const res = await apiClient.put(
      `/outfits/${write.outfitId}/visibility`,
      { visibility, ...(shareWithUserIds ? { shareWithUserIds } : {}) },
      writeHeaders(write),
    );
    return parseWrite(res.data);
  },
};
