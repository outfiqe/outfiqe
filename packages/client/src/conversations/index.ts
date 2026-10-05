import type {
  ConversationMemberRole,
  ConversationPreview,
  ConversationsPage,
  CreateGroupInput,
  GroupMembers,
  Message,
  MessagesPage,
  NewMessageAttachmentInput,
} from "@outfiqe/types";

import type { ApiClient } from "../client";
import { IDEMPOTENCY_HEADER } from "../idempotency";

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
    params: { cursor?: string; limit?: number; q?: string } = {},
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

  createGroup: async (
    input: CreateGroupInput,
    idempotencyKey: string,
  ): Promise<ConversationPreview> => {
    const res = await client.post<ConversationPreview>("/conversations/groups", input, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return res.data;
  },

  renameGroup: async (conversationId: string, name: string): Promise<ConversationPreview> => {
    const res = await client.patch<ConversationPreview>(`/conversations/${conversationId}`, {
      name,
    });
    return res.data;
  },

  listGroupMembers: async (conversationId: string): Promise<GroupMembers> => {
    const res = await client.get<GroupMembers>(`/conversations/${conversationId}/members`);
    return res.data;
  },

  addGroupMembers: async (conversationId: string, userIds: string[]): Promise<GroupMembers> => {
    const res = await client.post<GroupMembers>(`/conversations/${conversationId}/members`, {
      userIds,
    });
    return res.data;
  },

  changeGroupMemberRole: async (
    conversationId: string,
    userId: string,
    role: ConversationMemberRole,
  ): Promise<GroupMembers> => {
    const res = await client.patch<GroupMembers>(
      `/conversations/${conversationId}/members/${userId}`,
      { role },
    );
    return res.data;
  },

  removeGroupMember: async (conversationId: string, userId: string): Promise<GroupMembers> => {
    const res = await client.del<GroupMembers>(
      `/conversations/${conversationId}/members/${userId}`,
    );
    return res.data;
  },

  leaveGroup: async (conversationId: string): Promise<void> => {
    await client.post<Record<string, never>>(`/conversations/${conversationId}/leave`);
  },
});

export type ConversationsApi = ReturnType<typeof createConversationsApi>;
