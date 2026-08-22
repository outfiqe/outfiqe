import type { ChallengeStatus } from "./challenge.types.js";

export const computeChallengeStatus = (
  activeFrom: Date | null,
  activeUntil: Date | null,
  now: Date,
): ChallengeStatus => {
  if (activeFrom && now < activeFrom) return "UPCOMING";
  if (activeUntil && now > activeUntil) return "ENDED";
  return "OPEN";
};
