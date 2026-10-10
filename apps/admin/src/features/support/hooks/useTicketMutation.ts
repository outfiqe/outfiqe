import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import type { SupportTicketWithThread } from "../api/supportSchemas";
import { INBOX_KEY, STATS_KEY, TICKET_KEY } from "../constants/supportQueryKeys";

type TicketMutationContext = { previousTicket?: SupportTicketWithThread };

export const useTicketMutation = <TArgs>(
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
