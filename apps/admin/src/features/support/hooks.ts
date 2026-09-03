import { toast } from "@outfiqe/design-system";
import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { supportApi } from "./api";
import type {
  SupportInboxFilters,
  SupportPriorityValue,
  SupportStatusValue,
  SupportTicketWithThread,
  SupportVisibilityValue,
} from "./schemas";

const INBOX_KEY = "support-tickets";
const TICKET_KEY = "support-ticket";
const STATS_KEY = ["support-stats"] as const;

export const useSupportInbox = (filters: SupportInboxFilters) =>
  useInfiniteCursorPage([INBOX_KEY, filters], (cursor) => supportApi.list(filters, cursor));

export const useSupportTicket = (id: string) =>
  useQuery({ queryKey: [TICKET_KEY, id], queryFn: () => supportApi.get(id) });

export const useSupportStats = () =>
  useQuery({ queryKey: STATS_KEY, queryFn: () => supportApi.stats() });

export const useSupportAgents = () =>
  useQuery({ queryKey: ["support-agents"], queryFn: () => supportApi.agents() });

const useTicketMutation = <TArgs>(
  id: string,
  mutationFn: (args: TArgs) => Promise<SupportTicketWithThread>,
  successMessage: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (ticket) => {
      queryClient.setQueryData([TICKET_KEY, id], ticket);
      void queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
      void queryClient.invalidateQueries({ queryKey: STATS_KEY });
      toast.success(successMessage);
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });
};

export const useSupportReply = (id: string) =>
  useTicketMutation(
    id,
    (input: {
      body: string;
      visibility: SupportVisibilityValue;
      moveToWaitingOnCustomer?: boolean;
    }) => supportApi.reply(id, input),
    "Message posted.",
  );

export const useSupportStatus = (id: string) =>
  useTicketMutation(
    id,
    (input: { status: SupportStatusValue; expectedStatus: SupportStatusValue }) =>
      supportApi.setStatus(id, input.status, input.expectedStatus),
    "Status updated.",
  );

export const useSupportAssign = (id: string) =>
  useTicketMutation(
    id,
    (assigneeUserId: string | null) => supportApi.assign(id, assigneeUserId),
    "Assignee updated.",
  );

export const useSupportPriority = (id: string) =>
  useTicketMutation(
    id,
    (priority: SupportPriorityValue) => supportApi.setPriority(id, priority),
    "Priority updated.",
  );
