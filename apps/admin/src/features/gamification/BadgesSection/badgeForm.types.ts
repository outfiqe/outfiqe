import type {
  AUTO_ANIMATION_OPTION,
  BADGE_DESIGN_MODE,
  RULE_BASED_REQUIREMENT_TYPES,
} from "../badgeOptions.constants";
import type { ConditionFormState } from "../conditions/condition.types";
import type {
  BadgeAnimationValue,
  BadgeCategoryValue,
  BadgeLayer,
  BadgeRarityValue,
  BadgeShapeValue,
} from "../schemas";

export type BadgeDesignMode = (typeof BADGE_DESIGN_MODE)[keyof typeof BADGE_DESIGN_MODE];

export type BadgeFormState = {
  name: string;
  description: string;
  category: BadgeCategoryValue;
  rarity: BadgeRarityValue;
  icon: string;
  iconImageUrl: string;
  shape: BadgeShapeValue;
  primaryColor: string;
  animation: BadgeAnimationValue | typeof AUTO_ANIMATION_OPTION;
  designMode: BadgeDesignMode;
  studioLayers: BadgeLayer[];
  xpReward: string;
  isPermanent: boolean;
  isDynamic: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
  isAdminAward: boolean;
  assignmentLimit: string;
  sponsorBrandId: string | null;
  sponsorBrandName: string;
  requirementType: (typeof RULE_BASED_REQUIREMENT_TYPES)[number];
  conditions: ConditionFormState[];
  activeFrom: string;
  activeUntil: string;
};
