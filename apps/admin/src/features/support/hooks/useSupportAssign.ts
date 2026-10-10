import { supportApi } from "../api/supportApi";
import { useTicketMutation } from "./useTicketMutation";

export const useSupportAssign = (id: string) =>
  useTicketMutation(
    id,
    (input: { assigneeUserId: string | null; expectedAssigneeUserId: string | null }) =>
      supportApi.assign(id, input.assigneeUserId, input.expectedAssigneeUserId),
    "Assignee updated.",
    (ticket, input) => ({ ...ticket, assigneeUserId: input.assigneeUserId }),
  );
