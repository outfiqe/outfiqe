import { supportApi } from "../api/supportApi";
import type { SupportPriorityValue } from "../api/supportSchemas";
import { useTicketMutation } from "./useTicketMutation";

export const useSupportPriority = (id: string) =>
  useTicketMutation(
    id,
    (input: { priority: SupportPriorityValue; expectedPriority: SupportPriorityValue }) =>
      supportApi.setPriority(id, input.priority, input.expectedPriority),
    "Priority updated.",
    (ticket, input) => ({ ...ticket, priority: input.priority }),
  );
