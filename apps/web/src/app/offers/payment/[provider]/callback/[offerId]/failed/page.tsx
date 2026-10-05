import type { Metadata } from "next";
import { Suspense } from "react";

import { OfferPaymentScreen } from "@/features/outfit-offers";

export const metadata: Metadata = { title: "Offer payment" };

type OfferPaymentFailedPageProps = {
  params: Promise<{ offerId: string }>;
};

const OfferPaymentFailedPage = async ({ params }: OfferPaymentFailedPageProps) => {
  const { offerId } = await params;

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-md items-center justify-center px-6 py-16">
      <Suspense fallback={null}>
        <OfferPaymentScreen offerId={offerId} gatewayReportedFailure />
      </Suspense>
    </div>
  );
};

export default OfferPaymentFailedPage;
