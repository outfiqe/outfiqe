import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentCallbackScreen } from "@/features/payments";

export const metadata: Metadata = { title: "Payment" };

interface PaymentCallbackPageProps {
  params: Promise<{ orderId: string }>;
}

const PaymentCallbackPage = async ({ params }: PaymentCallbackPageProps) => {
  const { orderId } = await params;

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-md items-center justify-center px-6 py-16">
      <Suspense fallback={null}>
        <PaymentCallbackScreen orderId={orderId} />
      </Suspense>
    </div>
  );
};

export default PaymentCallbackPage;
