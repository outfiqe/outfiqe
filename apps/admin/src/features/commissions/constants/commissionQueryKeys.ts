import type { CommissionScopeValue } from "../api/commissionsSchemas";

export const commissionQueryKeys = {
  tiers: (scope: CommissionScopeValue) => ["admin-commission-tiers", scope],
  tierHistory: (scope: CommissionScopeValue) => ["admin-commission-tier-history", scope],
  priceTests: (scope: CommissionScopeValue) => ["admin-commission-price-test", scope],
  priceTest: (scope: CommissionScopeValue, price: number) => [
    "admin-commission-price-test",
    scope,
    price,
  ],
};

export const tierChangeQueryKeys = (scope: CommissionScopeValue) => [
  commissionQueryKeys.tiers(scope),
  commissionQueryKeys.tierHistory(scope),
  commissionQueryKeys.priceTests(scope),
];
