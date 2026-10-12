import type { Prisma } from "#generated/prisma/client.js";
import { chatService } from "#modules/chat/chat.service.js";

import { NONE } from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import { outfitRepository } from "./outfit.repository.js";
import type { OutfitActor } from "./outfit.types.js";

export const requireReachablePeople = async (
  tx: Prisma.TransactionClient,
  actor: OutfitActor,
  userIds: string[],
): Promise<OutfitActor[]> => {
  const invitablePeople = await outfitRepository.findInvitablePeople(tx, userIds);
  const invitableById = new Map(invitablePeople.map((person) => [person.id, person]));
  const blockChecks = await Promise.all(
    userIds.map((userId) => chatService.hasBlockBetween(actor.id, userId)),
  );

  const unavailableUserIds = userIds.filter(
    (userId, index) => !invitableById.has(userId) || blockChecks[index],
  );
  if (unavailableUserIds.length > NONE) throw outfitErrors.peopleUnavailable(unavailableUserIds);

  return userIds.flatMap((userId) => {
    const person = invitableById.get(userId);
    return person ? [person] : [];
  });
};
