"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useFocusOnMount } from "@/shared/hooks/useFocusOnMount";

import { PaymentVerifyStatus } from "../api/paymentsSchemas";
import { useInitiatePayment } from "../hooks/useInitiatePayment";
import { useVerifyPayment } from "../hooks/useVerifyPayment";
import { redirectToPaymentGateway } from "../paymentRedirect.utils";
import { PaymentFailed } from "./PaymentFailed";
import { PaymentPending } from "./PaymentPending";
import { PaymentStillPending } from "./PaymentStillPending";
import { PaymentSuccess } from "./PaymentSuccess";

const MissingOrder = () => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[28px] font-bold text-foreground outline-none"
      >
        Something&apos;s missing
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">
        We couldn&apos;t tell which order this payment was for.
      </p>
      <Link href="/orders" className="mt-5 inline-block text-sm font-semibold text-primary-strong">
        Go to your orders
      </Link>
    </div>
  );
};

export const PaymentCallbackScreen = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const verify = useVerifyPayment(orderId ?? "");
  const retryPayment = useInitiatePayment();

  if (!orderId) return <MissingOrder />;

  const status = verify.data?.status;

  if (status === PaymentVerifyStatus.COMPLETE) return <PaymentSuccess orderId={orderId} />;

  if (verify.isError || status === PaymentVerifyStatus.FAILED) {
    return (
      <PaymentFailed
        orderId={orderId}
        isRetrying={retryPayment.isPending}
        onRetry={() =>
          retryPayment.mutate(orderId, {
            onSuccess: redirectToPaymentGateway,
          })
        }
      />
    );
  }

  if (verify.hasTimedOut) return <PaymentStillPending orderId={orderId} />;

  return <PaymentPending />;
};
