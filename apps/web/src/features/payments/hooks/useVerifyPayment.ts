"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { paymentsApi } from "../api/paymentsApi";
import { PaymentVerifyStatus } from "../api/paymentsSchemas";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;
const POLL_TIMEOUT_MS = POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS;

export const useVerifyPayment = (orderId: string) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const query = useQuery({
    queryKey: ["payment-verify", orderId],
    queryFn: () => paymentsApi.verify(orderId),
    refetchInterval: (activeQuery) =>
      activeQuery.state.data?.status === PaymentVerifyStatus.PENDING ? POLL_INTERVAL_MS : false,
  });

  const isPending = query.data?.status === PaymentVerifyStatus.PENDING;

  useEffect(() => {
    if (!isPending) return;
    const timer = setTimeout(() => setHasTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  return { ...query, hasTimedOut: hasTimedOut && isPending };
};
