import type {
  BadgeAnimationValue,
  BadgeCategoryValue,
  BadgeLayer,
  BadgeRarityValue,
  BadgeShapeValue,
} from "../../api/gamificationSchemas";
import type { ConditionFormState } from "../../conditions/types/condition.types";
import type {
  AUTO_ANIMATION_OPTION,
  BADGE_DESIGN_MODE,
  RULE_BASED_REQUIREMENT_TYPES,
} from "../../constants/badgeOptions.constants";

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
  showProfileRing: boolean;
  isAdminAward: boolean;
  assignmentLimit: string;
  sponsorBrandId: string | null;
  sponsorBrandName: string;
  requirementType: (typeof RULE_BASED_REQUIREMENT_TYPES)[number];
  conditions: ConditionFormState[];
  activeFrom: string;
  activeUntil: string;
};
