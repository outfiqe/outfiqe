import type { LevelProgress, LevelRecord } from "./xp.types.js";

const TOP_LEVEL_INDEX = 0;
const NEXT_LEVEL_STEP = 1;
const MS_PER_SECOND = 1000;

export const computeLevelProgress = (totalXp: number, levelsDesc: LevelRecord[]): LevelProgress => {
  const level = levelsDesc.find((candidate) => totalXp >= candidate.requiredXp);
  if (!level) {
    throw new Error("No level configured with requiredXp 0 — cannot resolve a floor level.");
  }

  const levelIndex = levelsDesc.indexOf(level);
  const nextLevel =
    levelIndex > TOP_LEVEL_INDEX ? (levelsDesc[levelIndex - NEXT_LEVEL_STEP] ?? null) : null;

  return { level, nextLevel };
};

export const xpToNextLevel = (totalXp: number, nextLevel: LevelRecord | null): number | null =>
  nextLevel ? nextLevel.requiredXp - totalXp : null;

export const hasReachedMaxPerEntity = (
  existingCount: number,
  maxPerEntity: number | null,
): boolean => maxPerEntity !== null && existingCount >= maxPerEntity;

export const isWithinCooldown = (
  lastAwardedAt: Date | null,
  cooldownSeconds: number | null,
  now: Date,
): boolean => {
  if (cooldownSeconds === null || lastAwardedAt === null) return false;
  return now.getTime() - lastAwardedAt.getTime() < cooldownSeconds * MS_PER_SECOND;
};

export const hasReachedDailyLimit = (
  sumLast24h: number,
  incomingAmount: number,
  dailyLimit: number | null,
): boolean => dailyLimit !== null && sumLast24h + incomingAmount > dailyLimit;
