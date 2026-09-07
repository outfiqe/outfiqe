import { Button } from "@outfiqe/design-system";
import { Check } from "lucide-react";
import Link from "next/link";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

type PaymentSuccessProps = {
  orderId: string;
};

export const PaymentSuccess = ({ orderId }: PaymentSuccessProps) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="size-10" strokeWidth={3} aria-hidden />
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 font-display text-[28px] font-bold text-foreground outline-none"
      >
        Payment received
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        Your payment went through. We&apos;re getting your order ready.
      </p>
      <Button asChild className="mt-6">
        <Link href={`/orders/${orderId}`}>View order</Link>
      </Button>
    </div>
  );
};
