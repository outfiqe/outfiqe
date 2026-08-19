import { addWeeks } from "date-fns/addWeeks";
import { getISOWeek } from "date-fns/getISOWeek";
import { getISOWeekYear } from "date-fns/getISOWeekYear";
import { startOfISOWeek } from "date-fns/startOfISOWeek";
import { subWeeks } from "date-fns/subWeeks";

import {
  LEADERBOARD_CATEGORY,
  type LeaderboardCategory,
} from "#constants/leaderboard.constants.js";

const WEEK_LABEL_PAD_LENGTH = 2;

export const isoWeekKey = (date: Date): string => {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(WEEK_LABEL_PAD_LENGTH, "0");
  return `${year}-W${week}`;
};

export const currentIsoWeekKey = (now: Date): string => isoWeekKey(now);

export const previousIsoWeekKey = (now: Date): string => isoWeekKey(subWeeks(now, 1));

export const currentIsoWeekStart = (now: Date): Date => startOfISOWeek(now);

export const nextIsoWeekStart = (now: Date): Date => addWeeks(startOfISOWeek(now), 1);

export const formatScoreLabel = (category: LeaderboardCategory, score: number): string => {
  switch (category) {
    case LEADERBOARD_CATEGORY.TRENDING:
      return `${Math.round(score)} pts`;
    case LEADERBOARD_CATEGORY.MOST_PURCHASED:
      return `${Math.round(score)} sold`;
    case LEADERBOARD_CATEGORY.MOST_LOVED:
      return `${Math.round(score)} new followers`;
    case LEADERBOARD_CATEGORY.FASTEST_GROWING:
      return `${score >= 0 ? "+" : ""}${Math.round(score)}%`;
  }
};
