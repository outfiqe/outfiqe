import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

type PaymentSuccessProps = {
  orderId: string;
};

export const PaymentSuccess = ({ orderId }: PaymentSuccessProps) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Payment received
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Your payment went through. We&apos;re getting your order ready.
      </p>
      <Link href={`/orders/${orderId}`} className="mt-5 inline-block">
        <Button>View order</Button>
      </Link>
    </div>
  );
};
