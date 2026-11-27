import { cn } from "@/shared/lib/cn";

import type { OrderCancellationNotice as OrderCancellationNoticeValue } from "../utils/orderRefundNotice.utils";

type OrderCancellationNoticeProps = {
  notice: OrderCancellationNoticeValue;
};

export const OrderCancellationNotice = ({ notice }: OrderCancellationNoticeProps) => {
  const { headline, reasonSentence, moneySentence, isActionNeeded } = notice;

  return (
    <section
      aria-label="Cancellation details"
      className={cn(
        "mt-6 rounded-2xl border p-4 text-sm",
        isActionNeeded ? "border-amber-300 bg-amber-50" : "border-border bg-muted/40",
      )}
    >
      <p className="font-semibold text-foreground">{headline}</p>
      {reasonSentence && <p className="mt-1 text-muted-foreground">{reasonSentence}</p>}
      {moneySentence && <p className="mt-1 text-foreground">{moneySentence}</p>}
    </section>
  );
};
