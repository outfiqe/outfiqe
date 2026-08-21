"use client";

import { Skeleton } from "@outfiqe/design-system";

import { useChallenges } from "../hooks/useChallenges";
import { ChallengeCard } from "./ChallengeCard";

export const ChallengesSection = () => {
  const { data: challenges, isPending } = useChallenges();

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Challenges</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Time-boxed goals — finish one before it ends to earn its badge and XP.
        </p>
      </div>

      {isPending && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && challenges?.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No challenges are running right now.</p>
        </div>
      )}

      {challenges && challenges.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
};
