"use client";

import { useGamificationSocket } from "../hooks/useGamificationSocket";

export const GamificationSocketListener = () => {
  useGamificationSocket();
  return null;
};
