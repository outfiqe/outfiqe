import type {
  ConversationPreview,
  ConversationsPage,
  Message,
  MessagesPage,
  NewMessageAttachmentInput,
} from "@outfiqe/types";

import type { ApiClient } from "../client";

export const createConversationsApi = (client: ApiClient) => ({
  startConversation: async (userId: string): Promise<ConversationPreview> => {
    const res = await client.post<ConversationPreview>("/conversations", { userId });
    return res.data;
  },

  getConversation: async (conversationId: string): Promise<ConversationPreview> => {
    const res = await client.get<ConversationPreview>(`/conversations/${conversationId}`);
    return res.data;
  },

  listConversations: async (
    params: { cursor?: string; limit?: number } = {},
  ): Promise<ConversationsPage> => {
    const res = await client.get<ConversationsPage>("/conversations", { params });
    return res.data;
  },

  listMessages: async (
    conversationId: string,
    params: { cursor?: string; limit?: number } = {},
  ): Promise<MessagesPage> => {
    const res = await client.get<MessagesPage>(`/conversations/${conversationId}/messages`, {
      params,
    });
    return res.data;
  },

  sendMessage: async (
    conversationId: string,
    payload: { body?: string; attachments?: NewMessageAttachmentInput[] },
  ): Promise<Message> => {
    const res = await client.post<Message>(`/conversations/${conversationId}/messages`, payload);
    return res.data;
  },

  markConversationRead: async (conversationId: string): Promise<void> => {
    await client.patch<Record<string, never>>(`/conversations/${conversationId}/read`);
  },
});

export type ConversationsApi = ReturnType<typeof createConversationsApi>;
