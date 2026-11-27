import { Button } from "@outfiqe/design-system";

import { formatRupees } from "@/shared/lib/formatRupees";

import { jumpToRefundDetails } from "../utils/refundDetailsJump.utils";

type RefundDetailsActionBannerProps = {
  amountAwaitingDetails: number;
};

export const RefundDetailsActionBanner = ({
  amountAwaitingDetails,
}: RefundDetailsActionBannerProps) => (
  <section
    aria-label="Refund details needed"
    className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"
  >
    <p className="text-sm font-semibold text-foreground">
      Tell us where to send your {formatRupees(amountAwaitingDetails)} refund
    </p>
    <Button size="sm" onClick={jumpToRefundDetails}>
      Add refund details
    </Button>
  </section>
);
