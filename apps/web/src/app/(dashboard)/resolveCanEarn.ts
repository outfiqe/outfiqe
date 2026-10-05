import "server-only";

import type { ServerSession } from "@/features/auth/api/serverAuth";
import { CreatorStatus } from "@/features/auth/types";

export const resolveCanEarn = async (
  user: ServerSession["user"],
  loadEligibility: () => Promise<{ canEarn: boolean }>,
): Promise<boolean> => {
  const isApprovedCreator = user.creatorStatus === CreatorStatus.APPROVED;
  try {
    const { canEarn } = await loadEligibility();
    return canEarn;
  } catch {
    return isApprovedCreator;
  }
};
