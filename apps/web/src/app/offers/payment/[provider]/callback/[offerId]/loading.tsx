import { OfferPaymentScreenSkeleton } from "@/features/outfit-offers";

const OfferPaymentLoading = () => (
  <div className="mx-auto flex min-h-[70svh] max-w-md items-center justify-center px-6 py-16">
    <OfferPaymentScreenSkeleton />
  </div>
);

export default OfferPaymentLoading;
