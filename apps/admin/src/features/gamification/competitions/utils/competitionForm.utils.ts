import { type CreatorCompetitionFormInput } from "../../api/gamificationApi";
import type { CreatorCompetitionAdmin } from "../../api/gamificationSchemas";
import {
  AUTO_ANIMATION_OPTION,
  LEADERBOARD_CATEGORY_LABEL,
} from "../../constants/badgeOptions.constants";
import { legacyShapeAndColorOf } from "../../utils/designConfig.utils";
import { type CompetitionFormValues } from "../schemas/competitionForm.schema";

export const toFormInput = (values: CompetitionFormValues): CreatorCompetitionFormInput => ({
  name: values.name,
  description: `Awarded weekly to the top ${values.topN} in ${LEADERBOARD_CATEGORY_LABEL[values.leaderboardCategory]}.`,
  category: values.category,
  rarity: values.rarity,
  icon: values.icon,
  designConfig: {
    shape: values.shape,
    primaryColor: values.primaryColor,
    ...(values.animation === AUTO_ANIMATION_OPTION ? {} : { animation: values.animation }),
  },
  xpReward: Number(values.xpReward),
  isPermanent: values.isPermanent,
  isPublic: values.isPublic,
  isTitleEligible: values.isTitleEligible,
  leaderboardCategory: values.leaderboardCategory,
  topN: Number(values.topN),
});

export const formForCompetition = (
  competition: CreatorCompetitionAdmin,
): CompetitionFormValues => ({
  name: competition.name,
  category: competition.badge.category,
  rarity: competition.badge.rarity,
  icon: competition.badge.icon,
  ...legacyShapeAndColorOf(competition.badge.designConfig),
  animation: competition.badge.designConfig.animation ?? AUTO_ANIMATION_OPTION,
  xpReward: String(competition.badge.xpReward),
  isPermanent: competition.badge.isPermanent,
  isPublic: competition.badge.isPublic,
  isTitleEligible: competition.badge.isTitleEligible,
  leaderboardCategory: competition.category,
  topN: String(competition.topN),
});
