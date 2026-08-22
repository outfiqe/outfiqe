import { AUTO_ANIMATION_OPTION, BADGE_DESIGN_MODE } from "../badgeOptions.constants";
import { EMPTY_CONDITION } from "../conditions/condition.constants";
import type { BadgeFormState } from "./badgeForm.types";

export const BADGES_QUERY_KEY = ["admin-badges"];

export const EMPTY_FORM: BadgeFormState = {
  name: "",
  description: "",
  category: "ENGAGEMENT",
  rarity: "COMMON",
  icon: "",
  shape: "circle",
  primaryColor: "#94a3b8",
  animation: AUTO_ANIMATION_OPTION,
  designMode: BADGE_DESIGN_MODE.SIMPLE,
  studioLayers: [],
  xpReward: "0",
  isPermanent: true,
  isDynamic: false,
  isPublic: true,
  isTitleEligible: false,
  isAdminAward: false,
  assignmentLimit: "",
  sponsorBrandId: null,
  sponsorBrandName: "",
  requirementType: "ENGAGEMENT",
  conditions: [EMPTY_CONDITION],
  activeFrom: "",
  activeUntil: "",
};
