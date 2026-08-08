"use client";

import { useAuth } from "../context/AuthContext";
import type { UserSession } from "../types";

export const useCurrentUser = (): UserSession | null => {
  return useAuth().state.user;
};
