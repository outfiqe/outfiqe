"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { redirectToPaymentGateway } from "@/features/payments";

import { offerApi, type SendOfferInput } from "../api/offerApi";
import { offerQueryKeys } from "./offerQueryKeys";

export const useBuildOffers = (outfitId: string, isEnabled: boolean) =>
  useQuery({
    queryKey: offerQueryKeys.build(outfitId),
    queryFn: () => offerApi.listForBuild(outfitId),
    enabled: isEnabled,
  });

export const useReceivedOffers = (isEnabled: boolean) =>
  useInfiniteCursorPage(
    offerQueryKeys.received,
    (cursor) => offerApi.listReceived(cursor),
    isEnabled,
  );

export const useSentOffers = (isEnabled: boolean) =>
  useInfiniteCursorPage(offerQueryKeys.sent, (cursor) => offerApi.listSent(cursor), isEnabled);

export const useSendOffer = (outfitId: string) =>
  useMutation({
    mutationFn: (input: SendOfferInput) => offerApi.send(outfitId, input, crypto.randomUUID()),
    onSuccess: ({ payment }) => redirectToPaymentGateway(payment),
  });

export const useRetryOfferPayment = () =>
  useMutation({
    mutationFn: (offerId: string) => offerApi.retryPayment(offerId),
    onSuccess: ({ payment }) => redirectToPaymentGateway(payment),
  });

export const useRespondToOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      offerId,
      action,
    }: {
      offerId: string;
      action: "accept" | "decline" | "cancel";
    }) => offerApi.respond(offerId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: offerQueryKeys.all }),
  });
};
