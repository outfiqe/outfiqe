import { toast } from "@outfiqe/design-system";
import { useApiMutation, useInfiniteCursorPage } from "@outfiqe/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/AuthContext";
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

type TicketMutationContext = { previousTicket?: SupportTicketWithThread };

const useTicketMutation = <TArgs>(
  id: string,
  mutationFn: (args: TArgs) => Promise<SupportTicketWithThread>,
  successMessage: string,
  applyOptimistic?: (ticket: SupportTicketWithThread, args: TArgs) => SupportTicketWithThread,
) => {
  const queryClient = useQueryClient();
  return useApiMutation<SupportTicketWithThread, unknown, TArgs, TicketMutationContext>({
    mutationFn,
    invalidateKeys: [[INBOX_KEY], STATS_KEY],
    onMutate: async (args) => {
      if (!applyOptimistic) return {};
      await queryClient.cancelQueries({ queryKey: [TICKET_KEY, id] });
      const previousTicket = queryClient.getQueryData<SupportTicketWithThread>([TICKET_KEY, id]);
      if (previousTicket) {
        queryClient.setQueryData([TICKET_KEY, id], applyOptimistic(previousTicket, args));
      }
      return { previousTicket };
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData([TICKET_KEY, id], ticket);
      toast.success(successMessage);
    },
    onError: (mutationError, _args, context) => {
      if (context?.previousTicket) {
        queryClient.setQueryData([TICKET_KEY, id], context.previousTicket);
      }
      toast.error(getErrorMessage(mutationError));
    },
  });
};

export const useSupportReply = (id: string) => {
  const { state } = useAuth();
  const me = state.status === "signed-in" ? state.user : null;

  return useTicketMutation(
    id,
    (input: {
      body: string;
      visibility: SupportVisibilityValue;
      moveToWaitingOnCustomer?: boolean;
    }) => supportApi.reply(id, input),
    "Message posted.",
    (ticket, input) => ({
      ...ticket,
      messages: [
        ...ticket.messages,
        {
          id: `optimistic-${Date.now()}`,
          ticketId: id,
          authorKind: "STAFF",
          authorUserId: me?.id ?? null,
          authorName: me?.name ?? null,
          visibility: input.visibility,
          body: input.body,
          attachmentUrls: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  );
};

export const useSupportStatus = (id: string) =>
  useTicketMutation(
    id,
    (input: { status: SupportStatusValue; expectedStatus: SupportStatusValue }) =>
      supportApi.setStatus(id, input.status, input.expectedStatus),
    "Status updated.",
    (ticket, input) => ({ ...ticket, status: input.status }),
  );

export const useSupportAssign = (id: string) =>
  useTicketMutation(
    id,
    (input: { assigneeUserId: string | null; expectedAssigneeUserId: string | null }) =>
      supportApi.assign(id, input.assigneeUserId, input.expectedAssigneeUserId),
    "Assignee updated.",
    (ticket, input) => ({ ...ticket, assigneeUserId: input.assigneeUserId }),
  );

export const useSupportPriority = (id: string) =>
  useTicketMutation(
    id,
    (input: { priority: SupportPriorityValue; expectedPriority: SupportPriorityValue }) =>
      supportApi.setPriority(id, input.priority, input.expectedPriority),
    "Priority updated.",
    (ticket, input) => ({ ...ticket, priority: input.priority }),
  );
