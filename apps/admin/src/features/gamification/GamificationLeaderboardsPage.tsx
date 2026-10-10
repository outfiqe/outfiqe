import { CompetitionsSection } from "./competitions/components/CompetitionsSection";
import { LeaderboardSection } from "./leaderboards/components/LeaderboardSection";

export const GamificationLeaderboardsPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Leaderboards</h1>
      <LeaderboardSection />
      <CompetitionsSection />
    </div>
  );
};
