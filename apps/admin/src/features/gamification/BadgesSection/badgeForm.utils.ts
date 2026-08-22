import type { BadgeFormInput } from "../api";
import { AUTO_ANIMATION_OPTION, BADGE_DESIGN_MODE } from "../badgeOptions.constants";
import { EMPTY_CONDITION } from "../conditions/condition.constants";
import { toDatetimeLocalValue, toIsoOrNull } from "../datetime.utils";
import { isStudioDesignConfig, legacyShapeAndColorOf, studioLayersOf } from "../designConfig.utils";
import { ADMIN_AWARD_REQUIREMENT_TYPE, type BadgeAdmin } from "../schemas";
import type { BadgeFormState } from "./badgeForm.types";

export const formForBadge = (badge: BadgeAdmin): BadgeFormState => {
  const isStudioDesign = isStudioDesignConfig(badge.designConfig);
  const { shape, primaryColor } = legacyShapeAndColorOf(badge.designConfig);

  return {
    name: badge.name,
    description: badge.description,
    category: badge.category,
    rarity: badge.rarity,
    icon: badge.icon,
    shape,
    primaryColor,
    animation: badge.designConfig.animation ?? AUTO_ANIMATION_OPTION,
    designMode: isStudioDesign ? BADGE_DESIGN_MODE.STUDIO : BADGE_DESIGN_MODE.SIMPLE,
    studioLayers: studioLayersOf(badge.designConfig),
    xpReward: String(badge.xpReward),
    isPermanent: badge.isPermanent,
    isDynamic: badge.isDynamic,
    isPublic: badge.isPublic,
    isTitleEligible: badge.isTitleEligible,
    isAdminAward: badge.achievement?.requirementType === ADMIN_AWARD_REQUIREMENT_TYPE,
    assignmentLimit: badge.assignmentLimit === null ? "" : String(badge.assignmentLimit),
    sponsorBrandId: badge.sponsorBrand?.id ?? null,
    sponsorBrandName: badge.sponsorBrand?.name ?? "",
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
  };
};

export const toFormInput = (form: BadgeFormState): BadgeFormInput => ({
  name: form.name,
  description: form.description,
  category: form.category,
  rarity: form.rarity,
  icon: form.icon,
  designConfig:
    form.designMode === BADGE_DESIGN_MODE.STUDIO
      ? {
          version: 2,
          layers: form.studioLayers,
          ...(form.animation === AUTO_ANIMATION_OPTION ? {} : { animation: form.animation }),
        }
      : {
          shape: form.shape,
          primaryColor: form.primaryColor,
          ...(form.animation === AUTO_ANIMATION_OPTION ? {} : { animation: form.animation }),
        },
  xpReward: Number(form.xpReward),
  isPermanent: form.isPermanent,
  isDynamic: form.isDynamic,
  isPublic: form.isPublic,
  isTitleEligible: form.isTitleEligible,
  assignmentLimit: form.isAdminAward && form.assignmentLimit ? Number(form.assignmentLimit) : null,
  sponsorBrandId: form.sponsorBrandId,
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
