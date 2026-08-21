import { EMPTY_CONDITION } from "../conditions/condition.constants";
import { toDatetimeLocalValue } from "../datetime.utils";
import type { ChallengeFormState } from "./challengeForm.types";

export const CHALLENGES_QUERY_KEY = ["admin-challenges"];

const DEFAULT_CHALLENGE_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;

export const createEmptyChallengeForm = (): ChallengeFormState => ({
  name: "",
  description: "",
  category: "SPECIAL",
  rarity: "RARE",
  icon: "",
  shape: "star",
  primaryColor: "#f97316",
  xpReward: "0",
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  requirementType: "ENGAGEMENT",
  conditions: [EMPTY_CONDITION],
  activeFrom: toDatetimeLocalValue(new Date().toISOString()),
  activeUntil: toDatetimeLocalValue(
    new Date(Date.now() + DEFAULT_CHALLENGE_LENGTH_MS).toISOString(),
  ),
  challengeName: "",
  challengeDescription: "",
  bannerImageUrl: null,
});
