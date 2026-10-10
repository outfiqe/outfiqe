import { BadgesSection } from "./badges/components/BadgesSection";
import { ChallengesSection } from "./challenges/components/ChallengesSection";

export const GamificationBadgesPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Badges &amp; Challenges</h1>
      <BadgesSection />
      <ChallengesSection />
    </div>
  );
};
