"use client";

import type { ConversationsApi } from "@outfiqe/client";
import type {
  ConversationMemberRole,
  ConversationPreview,
  CreateGroupInput,
  GroupMembers,
} from "@outfiqe/types";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { conversationQueryKey } from "./useConversation";
import { invalidateConversationsList } from "./useConversations";
import { conversationMessagesQueryKey } from "./useConversationThread";

export const groupMembersQueryKey = (conversationId: string) =>
  ["conversations", conversationId, "members"] as const;

const refreshGroupViews = (queryClient: QueryClient, conversationId: string): void => {
  void queryClient.invalidateQueries({
    queryKey: conversationQueryKey(conversationId),
    exact: true,
  });
  void queryClient.invalidateQueries({
    queryKey: conversationMessagesQueryKey(conversationId),
    exact: true,
  });
  void invalidateConversationsList(queryClient);
};

export const forgetConversation = (queryClient: QueryClient, conversationId: string): void => {
  queryClient.removeQueries({ queryKey: groupMembersQueryKey(conversationId), exact: true });
  queryClient.removeQueries({
    queryKey: conversationMessagesQueryKey(conversationId),
    exact: true,
  });
  void queryClient.invalidateQueries({
    queryKey: conversationQueryKey(conversationId),
    exact: true,
  });
  void invalidateConversationsList(queryClient);
};

export const useCreateGroup = (conversationsApi: ConversationsApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateGroupInput; idempotencyKey: string }) =>
      conversationsApi.createGroup(input, idempotencyKey),
    onSuccess: (conversation: ConversationPreview) => {
      queryClient.setQueryData(conversationQueryKey(conversation.id), conversation);
      void invalidateConversationsList(queryClient);
    },
  });
};

export const useGroupMembers = (
  conversationsApi: ConversationsApi,
  conversationId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: groupMembersQueryKey(conversationId),
    queryFn: () => conversationsApi.listGroupMembers(conversationId),
    enabled,
  });

export const useGroupActions = (conversationsApi: ConversationsApi, conversationId: string) => {
  const queryClient = useQueryClient();

  const onMembersChanged = (groupMembers: GroupMembers): void => {
    queryClient.setQueryData(groupMembersQueryKey(conversationId), groupMembers);
    refreshGroupViews(queryClient, conversationId);
  };

  const rename = useMutation({
    mutationFn: (name: string) => conversationsApi.renameGroup(conversationId, name),
    onSuccess: (conversation: ConversationPreview) => {
      queryClient.setQueryData(conversationQueryKey(conversationId), conversation);
      refreshGroupViews(queryClient, conversationId);
    },
  });

  const addMembers = useMutation({
    mutationFn: (userIds: string[]) => conversationsApi.addGroupMembers(conversationId, userIds),
    onSuccess: onMembersChanged,
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ConversationMemberRole }) =>
      conversationsApi.changeGroupMemberRole(conversationId, userId, role),
    onSuccess: onMembersChanged,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => conversationsApi.removeGroupMember(conversationId, userId),
    onSuccess: onMembersChanged,
  });

  const leave = useMutation({
    mutationFn: () => conversationsApi.leaveGroup(conversationId),
    onSuccess: () => forgetConversation(queryClient, conversationId),
  });

  return { rename, addMembers, changeRole, removeMember, leave };
};
