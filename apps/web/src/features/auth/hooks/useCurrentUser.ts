"use client";

import { useAuth } from "../context/AuthContext";
import type { UserSession } from "../types";

// Thin wrapper so components depend on "the current user" rather than the
// whole auth context — most only need this.
export function useCurrentUser(): UserSession | null {
  return useAuth().state.user;
}
