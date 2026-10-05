export const offerQueryKeys = {
  all: ["outfit-offers"] as const,
  build: (outfitId: string) => ["outfit-offers", "build", outfitId] as const,
  received: ["outfit-offers", "received"] as const,
  sent: ["outfit-offers", "sent"] as const,
  paymentCheck: (offerId: string) => ["outfit-offers", "payment-check", offerId] as const,
};
