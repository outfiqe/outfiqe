import type { ChallengeFormInput } from "../../api/gamificationApi";
import type { ChallengeAdmin } from "../../api/gamificationSchemas";
import { AUTO_ANIMATION_OPTION } from "../../constants/badgeOptions.constants";
import { toDatetimeLocalValue, toIsoOrNull } from "../../utils/datetime.utils";
import { legacyShapeAndColorOf } from "../../utils/designConfig.utils";
import type { ChallengeFormState } from "../types/challengeForm.types";

export const formForChallenge = (challenge: ChallengeAdmin): ChallengeFormState => ({
  name: challenge.badge.name,
  description: challenge.badge.description,
  category: challenge.badge.category,
  rarity: challenge.badge.rarity,
  icon: challenge.badge.icon,
  ...legacyShapeAndColorOf(challenge.badge.designConfig),
  animation: challenge.badge.designConfig.animation ?? AUTO_ANIMATION_OPTION,
  xpReward: String(challenge.badge.xpReward),
  isPermanent: challenge.badge.isPermanent,
  isPublic: challenge.badge.isPublic,
  isTitleEligible: challenge.badge.isTitleEligible,
  requirementType: challenge.achievement.requirementType,
  conditions: challenge.achievement.conditions.map((condition) => ({
    metric: condition.metric,
    operator: condition.operator,
    value: String(condition.value),
  })),
  activeFrom: toDatetimeLocalValue(challenge.achievement.activeFrom),
  activeUntil: toDatetimeLocalValue(challenge.achievement.activeUntil),
  challengeName: challenge.name,
  challengeDescription: challenge.description,
  bannerImageUrl: challenge.bannerImageUrl,
});

export const toChallengeFormInput = (form: ChallengeFormState): ChallengeFormInput => ({
  name: form.name,
  description: form.description,
  category: form.category,
  rarity: form.rarity,
  icon: form.icon,
  designConfig: {
    shape: form.shape,
    primaryColor: form.primaryColor,
    ...(form.animation === AUTO_ANIMATION_OPTION ? {} : { animation: form.animation }),
  },
  xpReward: Number(form.xpReward),
  isPermanent: form.isPermanent,
  isPublic: form.isPublic,
  isTitleEligible: form.isTitleEligible,
  requirementType: form.requirementType,
  conditions: form.conditions.map((condition) => ({
    metric: condition.metric,
    operator: condition.operator,
    value: Number(condition.value),
  })),
  activeFrom: toIsoOrNull(form.activeFrom) ?? "",
  activeUntil: toIsoOrNull(form.activeUntil) ?? "",
  challengeName: form.challengeName,
  challengeDescription: form.challengeDescription,
  bannerImageUrl: form.bannerImageUrl,
});
