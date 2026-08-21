import { ActivityConfigSection } from "./ActivityConfigSection";
import { BadgesSection } from "./BadgesSection";
import { ChallengesSection } from "./ChallengesSection";
import { LeaderboardSection } from "./LeaderboardSection";
import { LevelsSection } from "./LevelsSection";
import { ManualActionsSection } from "./ManualActionsSection";
import { StatsSection } from "./StatsSection";

export const GamificationPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Gamification</h1>
      <StatsSection />
      <LevelsSection />
      <ActivityConfigSection />
      <BadgesSection />
      <ChallengesSection />
      <LeaderboardSection />
      <ManualActionsSection />
    </div>
  );
};
