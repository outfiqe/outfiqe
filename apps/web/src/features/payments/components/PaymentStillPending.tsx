import { Loader2 } from "lucide-react";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

type PaymentStillPendingProps = {
  orderId: string;
};

export const PaymentStillPending = ({ orderId }: PaymentStillPendingProps) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="flex flex-col items-center text-center">
      <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 font-display text-[28px] font-bold text-foreground outline-none"
      >
        Still confirming…
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        This is taking longer than usual. Your order is saved — check its status in a moment.
      </p>
      <Link
        href={`/orders/${orderId}`}
        className="mt-6 inline-block text-sm font-semibold text-primary-strong"
      >
        View order
      </Link>
    </div>
  );
};
