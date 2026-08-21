import { AUTO_ANIMATION_OPTION } from "../badgeOptions.constants";
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
  xpReward: "0",
  isPermanent: true,
  isDynamic: false,
  isPublic: true,
  isTitleEligible: false,
  isAdminAward: false,
  assignmentLimit: "",
  requirementType: "ENGAGEMENT",
  conditions: [EMPTY_CONDITION],
  activeFrom: "",
  activeUntil: "",
};
