"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { offerApi } from "../api/offerApi";
import { offerQueryKeys } from "./offerQueryKeys";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;
const POLL_TIMEOUT_MS = POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS;

export const useOfferPaymentCheck = (offerId: string) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const query = useQuery({
    queryKey: offerQueryKeys.paymentCheck(offerId),
    queryFn: () => offerApi.verifyPayment(offerId),
    refetchInterval: (activeQuery) => {
      const paymentCheck = activeQuery.state.data;
      const isStillWaiting = paymentCheck && !paymentCheck.isPaid && !paymentCheck.isFailed;
      return isStillWaiting ? POLL_INTERVAL_MS : false;
    },
  });

  const isStillWaiting = query.data !== undefined && !query.data.isPaid && !query.data.isFailed;

  useEffect(() => {
    if (!isStillWaiting) return;
    const timer = setTimeout(() => setHasTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isStillWaiting]);

  return { ...query, hasTimedOut: hasTimedOut && isStillWaiting };
};
