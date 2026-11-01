import type { TicketStatusValue } from "../api/ticketsSchemas";

export const TICKET_STATUS_TONE: Record<TicketStatusValue, "neutral" | "positive" | "negative"> = {
  OPEN: "negative",
  IN_PROGRESS: "neutral",
  RESOLVED: "positive",
  CLOSED: "positive",
};
