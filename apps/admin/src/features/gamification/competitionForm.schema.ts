import { z } from "zod";

import { wholeNumberText } from "@/lib/formFields";

import { AUTO_ANIMATION_OPTION } from "./badgeOptions.constants";
import {
  badgeAnimationSchema,
  badgeCategorySchema,
  badgeRaritySchema,
  badgeShapeSchema,
  creatorLeaderboardCategorySchema,
} from "./schemas";

export const MIN_COMPETITION_WINNERS = 1;
export const MAX_COMPETITION_WINNERS = 10;
const COMPETITION_NAME_MAX_LENGTH = 100;
const COMPETITION_ICON_MAX_LENGTH = 8;
const MAX_COMPETITION_XP_REWARD = 1_000_000;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const competitionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name for the competition.")
    .max(COMPETITION_NAME_MAX_LENGTH, `Use at most ${COMPETITION_NAME_MAX_LENGTH} characters.`),
  icon: z
    .string()
    .trim()
    .min(1, "Enter an icon for the trophy.")
    .max(COMPETITION_ICON_MAX_LENGTH, `Use at most ${COMPETITION_ICON_MAX_LENGTH} characters.`),
  leaderboardCategory: creatorLeaderboardCategorySchema,
  topN: wholeNumberText("how many winners", { max: MAX_COMPETITION_WINNERS }).refine(
    (raw) => raw === "" || Number(raw) >= MIN_COMPETITION_WINNERS,
    { message: `Pick at least ${MIN_COMPETITION_WINNERS} winner.` },
  ),
  xpReward: wholeNumberText("an XP reward", { max: MAX_COMPETITION_XP_REWARD }),
  category: badgeCategorySchema,
  rarity: badgeRaritySchema,
  shape: badgeShapeSchema,
  primaryColor: z.string().regex(HEX_COLOR_PATTERN, "Pick a color."),
  animation: z.union([badgeAnimationSchema, z.literal(AUTO_ANIMATION_OPTION)]),
  isPermanent: z.boolean(),
  isPublic: z.boolean(),
  isTitleEligible: z.boolean(),
});
export type CompetitionFormValues = z.infer<typeof competitionFormSchema>;

export const EMPTY_COMPETITION_FORM: CompetitionFormValues = {
  name: "",
  category: "SPECIAL",
  rarity: "RARE",
  icon: "🏆",
  shape: "star",
  primaryColor: "#f97316",
  animation: AUTO_ANIMATION_OPTION,
  xpReward: "50",
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  leaderboardCategory: "MOST_LIKES",
  topN: "3",
};
