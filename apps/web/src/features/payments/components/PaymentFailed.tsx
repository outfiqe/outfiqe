import { Button } from "@outfiqe/design-system";
import { X } from "lucide-react";
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
    <div className="flex flex-col items-center text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <X className="size-8" strokeWidth={3} aria-hidden />
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 font-display text-[28px] font-bold text-foreground outline-none"
      >
        Payment didn&apos;t go through
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Your order is still saved — you can try paying again, or check its status.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Trying again…" : "Try again"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/orders/${orderId}`}>View order</Link>
        </Button>
      </div>
    </div>
  );
};
