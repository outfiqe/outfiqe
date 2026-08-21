export const GAMIFICATION_SOCKET_EVENTS = {
  ACHIEVEMENT_UNLOCKED: "achievement:unlocked",
  LEVEL_UP: "level:up",
} as const;

export type AchievementUnlockedPayload = {
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  xpReward: number;
};

export type LevelUpPayload = {
  previousLevel: { level: number; name: string };
  currentLevel: { level: number; name: string; icon: string | null };
};
