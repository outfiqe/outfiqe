import type {
  AchievementMetricValue,
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
  ConditionOperatorValue,
} from "../schemas";
import type { BadgeFormState, ConditionFormState } from "./badgeForm.types";

export const BADGES_QUERY_KEY = ["admin-badges"];

export const CATEGORY_OPTIONS: BadgeCategoryValue[] = [
  "BEGINNER",
  "CREATOR",
  "COMMUNITY",
  "ENGAGEMENT",
  "COMMERCE",
  "SPECIAL",
];

export const RARITY_OPTIONS: BadgeRarityValue[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "EXCLUSIVE",
];

export const SHAPE_OPTIONS: BadgeShapeValue[] = ["circle", "shield", "star", "diamond", "hexagon"];

export const RULE_BASED_REQUIREMENT_TYPES = [
  "MILESTONE",
  "ACTIVITY",
  "ENGAGEMENT",
  "COMMERCE",
  "COMMUNITY",
  "LEVEL",
  "SPECIAL",
] as const;

export const METRIC_OPTIONS: AchievementMetricValue[] = [
  "level",
  "posts_created",
  "purchases_count",
  "total_likes",
  "comments_made",
  "sales_count",
  "total_views",
];

export const OPERATOR_OPTIONS: ConditionOperatorValue[] = ["gte", "gt", "eq", "lte", "lt"];

export const EMPTY_CONDITION: ConditionFormState = {
  metric: "total_likes",
  operator: "gte",
  value: "",
};

export const EMPTY_FORM: BadgeFormState = {
  name: "",
  description: "",
  category: "ENGAGEMENT",
  rarity: "COMMON",
  icon: "",
  shape: "circle",
  primaryColor: "#94a3b8",
  xpReward: "0",
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  isAdminAward: false,
  assignmentLimit: "",
  requirementType: "ENGAGEMENT",
  conditions: [EMPTY_CONDITION],
  activeFrom: "",
  activeUntil: "",
};
