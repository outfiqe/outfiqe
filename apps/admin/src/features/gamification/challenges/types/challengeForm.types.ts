import type {
  BadgeAnimationValue,
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
} from "../../api/gamificationSchemas";
import type { ConditionFormState } from "../../conditions/types/condition.types";
import type {
  AUTO_ANIMATION_OPTION,
  RULE_BASED_REQUIREMENT_TYPES,
} from "../../constants/badgeOptions.constants";

export type ChallengeFormState = {
  name: string;
  description: string;
  category: BadgeCategoryValue;
  rarity: BadgeRarityValue;
  icon: string;
  shape: BadgeShapeValue;
  primaryColor: string;
  animation: BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION;
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
