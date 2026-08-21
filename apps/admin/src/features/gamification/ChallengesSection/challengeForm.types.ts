import type { RULE_BASED_REQUIREMENT_TYPES } from "../badgeOptions.constants";
import type { ConditionFormState } from "../conditions/condition.types";
import type { BadgeCategoryValue, BadgeRarityValue, BadgeShapeValue } from "../schemas";

export type ChallengeFormState = {
  name: string;
  description: string;
  category: BadgeCategoryValue;
  rarity: BadgeRarityValue;
  icon: string;
  shape: BadgeShapeValue;
  primaryColor: string;
  xpReward: string;
  isPermanent: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
  requirementType: (typeof RULE_BASED_REQUIREMENT_TYPES)[number];
  conditions: ConditionFormState[];
  activeFrom: string;
  activeUntil: string;
  challengeName: string;
  challengeDescription: string;
  bannerImageUrl: string | null;
};
