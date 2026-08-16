import { CommissionsListSection } from "./CommissionsListSection";
import { CommissionTiersSection } from "./CommissionTiersSection";

export const CommissionsPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Commissions</h1>
      <CommissionTiersSection />
      <CommissionsListSection />
    </div>
  );
};
