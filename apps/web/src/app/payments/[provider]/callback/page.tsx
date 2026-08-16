import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentCallbackScreen } from "@/features/payments";

export const metadata: Metadata = { title: "Payment" };

const PaymentCallbackPage = () => {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Suspense fallback={null}>
        <PaymentCallbackScreen />
      </Suspense>
    </div>
  );
};

export default PaymentCallbackPage;
