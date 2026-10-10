"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { commissionApi } from "../api/commissionApi";

export const useCommissionEligibility = () => {
  const { isShopper, isCreator } = useAuth();

  const { data: eligibility } = useQuery({
    queryKey: ["commissions", "mine", "eligibility"],
    queryFn: commissionApi.getMyEligibility,
    enabled: isShopper && !isCreator,
  });

  return { canEarn: isCreator || eligibility?.canEarn === true };
};
