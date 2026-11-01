import { formatDate } from "../../utils/format.utils";
import type { Subscription } from "../api/billingSchemas";

const SINGLE_SEAT = 1;

export const toPlanStatusSentence = ({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: Pick<Subscription, "status" | "currentPeriodEnd" | "cancelAtPeriodEnd">): string => {
  const periodEnd = formatDate(currentPeriodEnd);
  if (status === "CANCELED") return `This plan ended on ${periodEnd}.`;
  if (status === "PAST_DUE") {
    return "Your last payment didn't go through. Pay the invoice below to keep your plan.";
  }
  if (cancelAtPeriodEnd) return `Your plan stays active until ${periodEnd}, then it ends.`;
  if (status === "TRIALING") return `Your trial runs until ${periodEnd}.`;
  return `Your plan renews on ${periodEnd}.`;
};

export const toSeatUsage = (activeSeatCount: number, seats: number): string =>
  `${activeSeatCount} of ${seats} ${seats === SINGLE_SEAT ? "seat" : "seats"} used`;
