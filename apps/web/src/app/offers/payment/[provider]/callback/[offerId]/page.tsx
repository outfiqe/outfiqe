import type { Metadata } from "next";
import { Suspense } from "react";

import { OfferPaymentScreen, OfferPaymentScreenSkeleton } from "@/features/outfit-offers";

export const metadata: Metadata = { title: "Offer payment" };

type OfferPaymentPageProps = {
  params: Promise<{ offerId: string }>;
};

const OfferPaymentPage = async ({ params }: OfferPaymentPageProps) => {
  const { offerId } = await params;

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-md items-center justify-center px-6 py-16">
      <Suspense fallback={<OfferPaymentScreenSkeleton />}>
        <OfferPaymentScreen offerId={offerId} />
      </Suspense>
    </div>
  );
};

export default OfferPaymentPage;
