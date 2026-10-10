import { BrandExemptionsSection } from "./BrandExemptionsSection";
import { CommissionTiersSection } from "./CommissionTiersSection";
import { GatewayFeeRatesSection } from "./GatewayFeeRatesSection";

export const PlatformCommissionPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Platform commission</h1>
      <CommissionTiersSection />
      <GatewayFeeRatesSection />
      <BrandExemptionsSection />
    </div>
  );
};
