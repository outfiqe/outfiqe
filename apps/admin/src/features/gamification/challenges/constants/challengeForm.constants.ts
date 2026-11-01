import { MS_PER_DAY } from "@outfiqe/utils";

import { EMPTY_CONDITION } from "../../conditions/constants/condition.constants";
import { AUTO_ANIMATION_OPTION } from "../../constants/badgeOptions.constants";
import { toDatetimeLocalValue } from "../../utils/datetime.utils";
import type { ChallengeFormState } from "../types/challengeForm.types";

export const CHALLENGES_QUERY_KEY = ["admin-challenges"];

const DEFAULT_CHALLENGE_LENGTH_DAYS = 7;
const DEFAULT_CHALLENGE_LENGTH_MS = DEFAULT_CHALLENGE_LENGTH_DAYS * MS_PER_DAY;

export const createEmptyChallengeForm = (): ChallengeFormState => ({
  name: "",
  description: "",
  category: "SPECIAL",
  rarity: "RARE",
  icon: "",
  shape: "star",
  primaryColor: "#f97316",
  animation: AUTO_ANIMATION_OPTION,
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
