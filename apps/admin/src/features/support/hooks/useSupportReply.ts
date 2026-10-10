import { useAuth } from "@/features/auth/components/AuthContext";

import { supportApi } from "../api/supportApi";
import type { SupportVisibilityValue } from "../api/supportSchemas";
import { useTicketMutation } from "./useTicketMutation";

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
    "Message sent.",
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
