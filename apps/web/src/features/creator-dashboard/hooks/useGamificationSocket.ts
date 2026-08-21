"use client";

import { toast } from "@outfiqe/design-system";
import { useEffect } from "react";

import { useAuth } from "@/features/auth";
import { acquireSocketConnection, releaseSocketConnection } from "@/shared/lib/socketClient";

import {
  type AchievementUnlockedPayload,
  GAMIFICATION_SOCKET_EVENTS,
  type LevelUpPayload,
} from "../socketEvents";

const formatAchievementToast = ({ badgeIcon, badgeName, xpReward }: AchievementUnlockedPayload) =>
  xpReward > 0
    ? `${badgeIcon} Achievement unlocked: ${badgeName}! +${xpReward} XP`
    : `${badgeIcon} Achievement unlocked: ${badgeName}!`;

const formatLevelUpToast = ({ currentLevel }: LevelUpPayload) =>
  `${currentLevel.icon ?? "⭐"} Level up! You're now Level ${currentLevel.level} — ${currentLevel.name}`;

export const useGamificationSocket = (): void => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = acquireSocketConnection();

    const handleAchievementUnlocked = (payload: AchievementUnlockedPayload) => {
      toast.success(formatAchievementToast(payload));
    };

    const handleLevelUp = (payload: LevelUpPayload) => {
      toast.success(formatLevelUpToast(payload));
    };

    socket.on(GAMIFICATION_SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED, handleAchievementUnlocked);
    socket.on(GAMIFICATION_SOCKET_EVENTS.LEVEL_UP, handleLevelUp);

    return () => {
      socket.off(GAMIFICATION_SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED, handleAchievementUnlocked);
      socket.off(GAMIFICATION_SOCKET_EVENTS.LEVEL_UP, handleLevelUp);
      releaseSocketConnection();
    };
  }, [isAuthenticated]);
};
