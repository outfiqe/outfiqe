import { supportApi } from "../api/supportApi";
import type { SupportStatusValue } from "../api/supportSchemas";
import { useTicketMutation } from "./useTicketMutation";

export const useSupportStatus = (id: string) =>
  useTicketMutation(
    id,
    (input: { status: SupportStatusValue; expectedStatus: SupportStatusValue }) =>
      supportApi.setStatus(id, input.status, input.expectedStatus),
    "Status updated.",
    (ticket, input) => ({ ...ticket, status: input.status }),
  );
