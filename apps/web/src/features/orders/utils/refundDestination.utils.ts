import { RefundDestinationKind } from "@outfiqe/types";

const REFUND_DESTINATION_KINDS: ReadonlySet<string> = new Set(Object.values(RefundDestinationKind));

export const isRefundDestinationKind = (value: string): value is RefundDestinationKind =>
  REFUND_DESTINATION_KINDS.has(value);
