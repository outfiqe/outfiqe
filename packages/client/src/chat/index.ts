import type { BlockedChatContact, ChatBlocksPage, ChatContact, ChatSettings } from "@outfiqe/types";

import type { ApiClient } from "../client";

export const createChatApi = (client: ApiClient) => ({
  getSettings: async (): Promise<ChatSettings> => {
    const res = await client.get<ChatSettings>("/chat/settings");
    return res.data;
  },

  updateSettings: async (isChatEnabled: boolean): Promise<ChatSettings> => {
    const res = await client.patch<ChatSettings>("/chat/settings", { isChatEnabled });
    return res.data;
  },

  listBlocks: async (params: { cursor?: string; limit?: number } = {}): Promise<ChatBlocksPage> => {
    const res = await client.get<ChatBlocksPage>("/chat/blocks", { params });
    return res.data;
  },

  searchContacts: async (q: string): Promise<ChatContact[]> => {
    const res = await client.get<{ contacts: ChatContact[] }>("/chat/blocks/search", {
      params: { q },
    });
    return res.data.contacts;
  },

  blockUser: async (userId: string): Promise<void> => {
    await client.post<BlockedChatContact>(`/chat/blocks/${userId}`);
  },

  unblockUser: async (userId: string): Promise<void> => {
    await client.del<Record<string, never>>(`/chat/blocks/${userId}`);
  },
});

export type ChatApi = ReturnType<typeof createChatApi>;
