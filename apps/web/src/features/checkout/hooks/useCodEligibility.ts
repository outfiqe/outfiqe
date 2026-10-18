"use client";

import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import { checkoutApi } from "../api/checkoutApi";
import { COD_ELIGIBILITY_PHONE_DEBOUNCE_MS } from "../constants/checkout.constants";

export const useCodEligibility = (phone: string, isSignedIn: boolean) => {
  const debouncedPhone = useDebouncedValue(phone.trim(), COD_ELIGIBILITY_PHONE_DEBOUNCE_MS);
  return useQuery({
    queryKey: ["cod-eligibility", debouncedPhone],
    queryFn: () => checkoutApi.getCodEligibility(debouncedPhone),
    enabled: isSignedIn,
  });
};
