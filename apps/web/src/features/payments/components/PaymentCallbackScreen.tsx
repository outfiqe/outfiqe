"use client";

import { PaymentVerifyStatus } from "../api/paymentsSchemas";
import { useInitiatePayment } from "../hooks/useInitiatePayment";
import { useVerifyPayment } from "../hooks/useVerifyPayment";
import { redirectToPaymentGateway } from "../paymentRedirect.utils";
import { PaymentFailed } from "./PaymentFailed";
import { PaymentPending } from "./PaymentPending";
import { PaymentStillPending } from "./PaymentStillPending";
import { PaymentSuccess } from "./PaymentSuccess";

type PaymentCallbackScreenProps = {
  orderId: string;
  gatewayReportedFailure?: boolean;
};

export const PaymentCallbackScreen = ({
  orderId,
  gatewayReportedFailure = false,
}: PaymentCallbackScreenProps) => {
  const verify = useVerifyPayment(orderId);
  const retryPayment = useInitiatePayment();

  const status = verify.data?.status;

  if (status === PaymentVerifyStatus.COMPLETE) return <PaymentSuccess orderId={orderId} />;

  if (verify.isError || status === PaymentVerifyStatus.FAILED || gatewayReportedFailure) {
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
