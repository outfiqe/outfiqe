import { useCallback } from "react";

import { holdsAnyPlatformPermission } from "@/lib/platformPermissions";

import { useAuth } from "./AuthContext";

export const usePlatformPermissions = () => {
  const { state } = useAuth();
  const viewer = state.status === "signed-in" ? state.user : null;

  const canUse = useCallback(
    (...permissionKeys: string[]) =>
      viewer !== null && holdsAnyPlatformPermission(viewer, ...permissionKeys),
    [viewer],
  );

  return { canUse, viewerUserId: viewer?.id ?? null };
};
