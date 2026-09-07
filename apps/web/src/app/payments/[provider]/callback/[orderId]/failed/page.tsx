import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentCallbackScreen } from "@/features/payments";

export const metadata: Metadata = { title: "Payment" };

interface PaymentCallbackFailedPageProps {
  params: Promise<{ orderId: string }>;
}

const PaymentCallbackFailedPage = async ({ params }: PaymentCallbackFailedPageProps) => {
  const { orderId } = await params;

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-md items-center justify-center px-6 py-16">
      <Suspense fallback={null}>
        <PaymentCallbackScreen orderId={orderId} gatewayReportedFailure />
      </Suspense>
    </div>
  );
};

export default PaymentCallbackFailedPage;
