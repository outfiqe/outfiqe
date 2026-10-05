import type { Prisma } from "#generated/prisma/client.js";
import {
  type OutfitEventType,
  OutfitMemberRole,
  type OutfitStatus,
} from "#generated/prisma/enums.js";
import { withIdempotentTransaction } from "#lib/idempotency.utils.js";

import { loadBoardView } from "./outfit.board.js";
import { recordOutfitChange } from "./outfit.changes.js";
import { outfitErrors } from "./outfit.errors.js";
import { type OutfitAccessRow, outfitRepository } from "./outfit.repository.js";
import type { OutfitActor, OutfitBoardView } from "./outfit.types.js";
import { toViewerRole } from "./outfit.utils.js";

export const OUTFIT_WRITE_ACCESS = {
  OWNER_ONLY: "OWNER_ONLY",
  ANY_MEMBER: "ANY_MEMBER",
} as const;

type OutfitWriteAccess = (typeof OUTFIT_WRITE_ACCESS)[keyof typeof OUTFIT_WRITE_ACCESS];

export type OutfitWriteContext = {
  tx: Prisma.TransactionClient;
  outfit: OutfitAccessRow;
  actor: OutfitActor;
  actorRole: OutfitMemberRole;
};

export type OutfitWriteOutcome = {
  eventType: OutfitEventType;
  payload: Prisma.InputJsonObject;
};

export type OutfitWriteRequest = {
  outfitId: string;
  actorId: string;
  expectedVersion: number;
  endpoint: string;
  idempotencyKey: string;
  requestBody: Prisma.InputJsonObject;
  access: OutfitWriteAccess;
  allowedStatuses: readonly OutfitStatus[];
  apply: (context: OutfitWriteContext) => Promise<OutfitWriteOutcome>;
};

export type OutfitWriteCall = {
  actorId: string;
  outfitId: string;
  expectedVersion: number;
  idempotencyKey: string;
};

export const toWriteRequest = (
  { actorId, outfitId, expectedVersion, idempotencyKey }: OutfitWriteCall,
  endpoint: string,
  requestBody: Prisma.InputJsonObject,
) => ({ actorId, outfitId, expectedVersion, idempotencyKey, endpoint, requestBody });

export type OutfitWriteResult = {
  version: number;
  board: OutfitBoardView | null;
};

const requireActor = async (
  tx: Prisma.TransactionClient,
  actorId: string,
): Promise<OutfitActor> => {
  const [actor] = await outfitRepository.findPeople(tx, [actorId]);
  if (!actor) throw outfitErrors.notFound();
  return { id: actor.id, name: actor.name };
};

const claimNextVersion = async (
  tx: Prisma.TransactionClient,
  outfitId: string,
  expectedVersion: number,
): Promise<OutfitAccessRow> => {
  const isClaimed = await outfitRepository.bumpVersion(tx, outfitId, expectedVersion);
  const outfit = await outfitRepository.findAccess(tx, outfitId);
  if (!outfit) throw outfitErrors.notFound();
  if (!isClaimed) throw outfitErrors.versionConflict(outfit.version);
  return outfit;
};

export const runOutfitWrite = ({
  outfitId,
  actorId,
  expectedVersion,
  endpoint,
  idempotencyKey,
  requestBody,
  access,
  allowedStatuses,
  apply,
}: OutfitWriteRequest): Promise<OutfitWriteResult> =>
  withIdempotentTransaction(
    {
      userId: actorId,
      endpoint,
      key: idempotencyKey,
      requestBody: { outfitId, expectedVersion, ...requestBody },
    },
    async (tx) => {
      const actorRole = await outfitRepository.findMemberRole(tx, outfitId, actorId);
      if (!actorRole) throw outfitErrors.notFound();
      if (access === OUTFIT_WRITE_ACCESS.OWNER_ONLY && actorRole !== OutfitMemberRole.OWNER) {
        throw outfitErrors.notOwner();
      }

      const outfit = await claimNextVersion(tx, outfitId, expectedVersion);
      if (!allowedStatuses.includes(outfit.status)) throw outfitErrors.notEditable(outfit.status);

      const actor = await requireActor(tx, actorId);
      const { eventType, payload } = await apply({ tx, outfit, actor, actorRole });

      await recordOutfitChange(tx, {
        outfitId,
        version: outfit.version,
        eventType,
        actor,
        details: payload,
        buildChatId: outfit.conversationId,
      });

      const actorRoleAfterWrite = await outfitRepository.findMemberRole(tx, outfitId, actorId);
      return {
        version: outfit.version,
        board: actorRoleAfterWrite
          ? await loadBoardView(tx, outfitId, toViewerRole(actorRoleAfterWrite))
          : null,
      };
    },
  );
