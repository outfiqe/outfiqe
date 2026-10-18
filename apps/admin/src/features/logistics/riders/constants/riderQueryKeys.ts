export const RIDERS_QUERY_KEY = ["logistics-riders"] as const;

export const ridersForHubQueryKey = (hubId: string) => ["logistics-riders", hubId] as const;

export const RIDER_INVITES_QUERY_KEY = ["logistics-rider-invites"] as const;
