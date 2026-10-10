import { ManualActionsSection } from "./manual-actions/components/ManualActionsSection";

export const GamificationManualActionsPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Manual Actions</h1>
      <ManualActionsSection />
    </div>
  );
};
