import { OffersSection } from "@/features/outfit-offers/components/OffersSection";

import { COMMISSION_SCOPE, type CommissionScopeValue } from "../api/commissionsSchemas";
import { CommissionsListSection } from "./CommissionsListSection";
import { CommissionTiersSection } from "./CommissionTiersSection";
import { TierChangeHistory } from "./TierChangeHistory";
import { TierPriceTestBox } from "./TierPriceTestBox";

const TIER_SCOPES: CommissionScopeValue[] = [
  COMMISSION_SCOPE.CREATOR_LOOK,
  COMMISSION_SCOPE.OUTFIT_BUILD,
];

export const CommissionsPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Commissions</h1>
      {TIER_SCOPES.map((scope) => (
        <div key={scope} className="space-y-4">
          <CommissionTiersSection scope={scope} />
          <TierPriceTestBox scope={scope} />
          <TierChangeHistory scope={scope} />
        </div>
      ))}
      <CommissionsListSection />
      <OffersSection />
    </div>
  );
};
