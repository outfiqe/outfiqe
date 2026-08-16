import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

type PaymentFailedProps = {
  orderId: string;
  onRetry: () => void;
  isRetrying: boolean;
};

export const PaymentFailed = ({ orderId, onRetry, isRetrying }: PaymentFailedProps) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Payment didn&apos;t go through
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Your order is still saved — you can try paying again, or check its status.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Trying again…" : "Try again"}
        </Button>
        <Link href={`/orders/${orderId}`}>
          <Button variant="outline">View order</Button>
        </Link>
      </div>
    </div>
  );
};
