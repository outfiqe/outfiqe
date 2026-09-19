"use client";

import { useApiMutation, useInfiniteCursorPage } from "@outfiqe/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { supportApi } from "../api/supportApi";
import type { SupportRequestFormInput } from "../schemas/support.schema";

const MINE_KEY = ["support-requests-mine"] as const;

export const useSubmitSupportRequest = () =>
  useApiMutation<{ reference: string; id: string }, ApiClientError, SupportRequestFormInput>({
    mutationFn: supportApi.create,
    invalidateKeys: [MINE_KEY],
  });

export const useMySupportRequests = () =>
  useInfiniteCursorPage(MINE_KEY, (cursor) => supportApi.listMine(cursor));

export const useSupportRequestThread = (id: string | null) =>
  useQuery({
    queryKey: ["support-request", id],
    queryFn: () => supportApi.getMine(id as string),
    enabled: Boolean(id),
  });

export const useReplyToSupportRequest = (id: string) => {
  const queryClient = useQueryClient();
  return useApiMutation<Awaited<ReturnType<typeof supportApi.replyMine>>, ApiClientError, string>({
    mutationFn: (body: string) => supportApi.replyMine(id, body),
    invalidateKeys: [MINE_KEY],
    onSuccess: (thread) => {
      queryClient.setQueryData(["support-request", id], thread);
    },
  });
};
