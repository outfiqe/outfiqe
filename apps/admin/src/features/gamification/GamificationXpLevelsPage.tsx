import { ActivityConfigSection } from "./ActivityConfigSection";
import { LevelsSection } from "./LevelsSection";
import { MultipliersSection } from "./MultipliersSection";

export const GamificationXpLevelsPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">XP &amp; Levels</h1>
      <LevelsSection />
      <MultipliersSection />
      <ActivityConfigSection />
    </div>
  );
};
