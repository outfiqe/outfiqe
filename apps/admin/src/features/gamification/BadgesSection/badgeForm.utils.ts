import type { BadgeFormInput } from "../api";
import { ADMIN_AWARD_REQUIREMENT_TYPE, type BadgeAdmin } from "../schemas";
import { EMPTY_CONDITION } from "./badgeForm.constants";
import type { BadgeFormState } from "./badgeForm.types";

export const toDatetimeLocalValue = (iso: string | null): string => {
  if (!iso) return "";
  const instant = new Date(iso);
  const localOffsetMs = instant.getTimezoneOffset() * 60000;
  return new Date(instant.getTime() - localOffsetMs).toISOString().slice(0, 16);
};

export const toIsoOrNull = (datetimeLocalValue: string): string | null =>
  datetimeLocalValue ? new Date(datetimeLocalValue).toISOString() : null;

export const formForBadge = (badge: BadgeAdmin): BadgeFormState => ({
  name: badge.name,
  description: badge.description,
  category: badge.category,
  rarity: badge.rarity,
  icon: badge.icon,
  shape: badge.designConfig.shape,
  primaryColor: badge.designConfig.primaryColor,
  xpReward: String(badge.xpReward),
  isPermanent: badge.isPermanent,
  isPublic: badge.isPublic,
  isTitleEligible: badge.isTitleEligible,
  isAdminAward: badge.achievement?.requirementType === ADMIN_AWARD_REQUIREMENT_TYPE,
  assignmentLimit: badge.assignmentLimit === null ? "" : String(badge.assignmentLimit),
  requirementType:
    badge.achievement && badge.achievement.requirementType !== ADMIN_AWARD_REQUIREMENT_TYPE
      ? badge.achievement.requirementType
      : "ENGAGEMENT",
  conditions:
    badge.achievement && badge.achievement.requirementType !== ADMIN_AWARD_REQUIREMENT_TYPE
      ? badge.achievement.requirementConfig.conditions.map((condition) => ({
          metric: condition.metric,
          operator: condition.operator,
          value: String(condition.value),
        }))
      : [EMPTY_CONDITION],
  activeFrom: toDatetimeLocalValue(badge.achievement?.activeFrom ?? null),
  activeUntil: toDatetimeLocalValue(badge.achievement?.activeUntil ?? null),
});

export const toFormInput = (form: BadgeFormState): BadgeFormInput => ({
  name: form.name,
  description: form.description,
  category: form.category,
  rarity: form.rarity,
  icon: form.icon,
  designConfig: { shape: form.shape, primaryColor: form.primaryColor },
  xpReward: Number(form.xpReward),
  isPermanent: form.isPermanent,
  isPublic: form.isPublic,
  isTitleEligible: form.isTitleEligible,
  assignmentLimit: form.isAdminAward && form.assignmentLimit ? Number(form.assignmentLimit) : null,
  ...(form.isAdminAward
    ? { requirementType: ADMIN_AWARD_REQUIREMENT_TYPE }
    : {
        requirementType: form.requirementType,
        conditions: form.conditions.map((condition) => ({
          metric: condition.metric,
          operator: condition.operator,
          value: Number(condition.value),
        })),
        activeFrom: toIsoOrNull(form.activeFrom),
        activeUntil: toIsoOrNull(form.activeUntil),
      }),
});
