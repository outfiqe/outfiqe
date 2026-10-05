import { prisma } from "#db/prisma.js";
import { OutfitStatus } from "#generated/prisma/enums.js";

import { OUTFIT_VIEWER_ROLE } from "./outfit.constants.js";
import { outfitRepository } from "./outfit.repository.js";
import type { OutfitViewerRole } from "./outfit.types.js";
import { toViewerRole } from "./outfit.utils.js";

export const resolveLiveBoardRole = async (
  outfitId: string,
  userId: string,
): Promise<OutfitViewerRole | null> => {
  const outfit = await outfitRepository.findAccess(prisma, outfitId);
  if (!outfit) return null;

  const memberRole = await outfitRepository.findMemberRole(prisma, outfitId, userId);
  if (memberRole) return toViewerRole(memberRole);

  const { status, sourceConversationId } = outfit;
  if (status === OutfitStatus.ARCHIVED || sourceConversationId === null) return null;

  const isInSourceChat = await outfitRepository.isConversationParticipant(
    prisma,
    sourceConversationId,
    userId,
  );
  return isInSourceChat ? OUTFIT_VIEWER_ROLE.VIEWER : null;
};
