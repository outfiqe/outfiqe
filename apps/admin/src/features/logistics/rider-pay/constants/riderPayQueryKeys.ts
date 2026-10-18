export const RIDER_PAY_QUERY_KEY = ["logistics-rider-pay"] as const;

export const riderPayRatesQueryKey = (countryCode: string) =>
  [...RIDER_PAY_QUERY_KEY, "rates", countryCode] as const;

export const riderEarningsQueryKey = (status: string | null) =>
  [...RIDER_PAY_QUERY_KEY, "earnings", status ?? "all"] as const;
