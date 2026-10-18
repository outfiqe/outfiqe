export const COD_QUERY_KEY = ["logistics-cod"] as const;

export const COD_SUMMARY_QUERY_KEY = [...COD_QUERY_KEY, "summary"] as const;

export const unremittedParcelsQueryKey = (partnerId: string | null, onlyOverdue: boolean) =>
  [...COD_QUERY_KEY, "parcels", partnerId ?? "none", onlyOverdue] as const;

export const codRemittancesQueryKey = (partnerId: string | null) =>
  [...COD_QUERY_KEY, "remittances", partnerId ?? "none"] as const;

export const codRemittanceDetailQueryKey = (remittanceId: string) =>
  [...COD_QUERY_KEY, "remittance", remittanceId] as const;
