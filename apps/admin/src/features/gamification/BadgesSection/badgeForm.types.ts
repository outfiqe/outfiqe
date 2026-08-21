import type {
  AchievementMetricValue,
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
  ConditionOperatorValue,
} from "../schemas";
import type { RULE_BASED_REQUIREMENT_TYPES } from "./badgeForm.constants";

export type ConditionFormState = {
  metric: AchievementMetricValue;
  operator: ConditionOperatorValue;
  value: string;
};

export type BadgeFormState = {
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
  isAdminAward: boolean;
  assignmentLimit: string;
  requirementType: (typeof RULE_BASED_REQUIREMENT_TYPES)[number];
  conditions: ConditionFormState[];
  activeFrom: string;
  activeUntil: string;
};
