import { OutfitEventType, OutfitMemberRole, OutfitStatus } from "#generated/prisma/enums.js";
import { buildChatService } from "#modules/chat/build-chat/build-chat.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import {
  NONE,
  OUTFIT_CHAT_FALLBACK_NAME,
  OUTFIT_IDEMPOTENCY_ENDPOINT,
} from "../outfit.constants.js";
import { outfitErrors } from "../outfit.errors.js";
import { requireReachablePeople } from "../outfit.people.js";
import { outfitRepository } from "../outfit.repository.js";
import type { AddEditorsBody, TransferOwnershipBody } from "../outfit.schemas.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "../outfit.write.js";

const DRAFT_ONLY = [OutfitStatus.DRAFT] as const;
const NOT_ARCHIVED = [OutfitStatus.DRAFT, OutfitStatus.LOCKED] as const;

export const outfitMemberService = {
  addEditors(call: OutfitWriteCall, { userIds }: AddEditorsBody): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.ADD_EDITORS, { userIds }),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: DRAFT_ONLY,
      apply: async ({ tx, outfit, actor }) => {
        const members = await outfitRepository.listMembers(tx, outfit.id);
        const memberIds = new Set(members.map((member) => member.userId));
        const newEditorIds = userIds.filter((userId) => !memberIds.has(userId));
        if (newEditorIds.length === NONE) throw outfitErrors.alreadyOnBuild();

        const maxEditorsPerBoard = await platformSettingsService.get("outfit.maxEditorsPerBoard");
        if (members.length + newEditorIds.length > maxEditorsPerBoard) {
          throw outfitErrors.tooManyEditors(maxEditorsPerBoard);
        }
        await requireReachablePeople(tx, actor, newEditorIds);
        await outfitRepository.addEditors(tx, outfit.id, newEditorIds, actor.id);

        if (outfit.conversationId) {
          await buildChatService.addMembers(tx, outfit.conversationId, actor, newEditorIds);
        } else {
          const editorIds = [...memberIds, ...newEditorIds].filter((userId) => userId !== actor.id);
          const conversationId = await buildChatService.createForBuild(tx, {
            name: outfit.title ?? OUTFIT_CHAT_FALLBACK_NAME,
            owner: actor,
            editorIds,
          });
          await outfitRepository.update(tx, outfit.id, { conversationId });
        }

        return { eventType: OutfitEventType.MEMBER_ADDED, payload: { userIds: newEditorIds } };
      },
    });
  },

  removeEditor(call: OutfitWriteCall, userId: string): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.REMOVE_EDITOR, { userId }),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor }) => {
        if (userId === actor.id) throw outfitErrors.ownerMustHandOver();
        const removedRole = await outfitRepository.findMemberRole(tx, outfit.id, userId);
        if (removedRole !== OutfitMemberRole.EDITOR) throw outfitErrors.memberNotFound();

        await outfitRepository.removeMember(tx, outfit.id, userId);
        const removedPerson = await outfitRepository.findPersonReference(tx, userId);
        if (outfit.conversationId && removedPerson) {
          await buildChatService.removeMember(tx, outfit.conversationId, actor, removedPerson);
        }
        return { eventType: OutfitEventType.MEMBER_REMOVED, payload: { userId } };
      },
    });
  },

  leave(call: OutfitWriteCall): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.LEAVE, {}),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor, actorRole }) => {
        if (actorRole === OutfitMemberRole.OWNER) throw outfitErrors.ownerMustHandOver();
        if (await outfitRepository.hasOfferAwaitingCreator(tx, outfit.id, actor.id)) {
          throw outfitErrors.openOfferBlocksLeave();
        }

        await outfitRepository.removeMember(tx, outfit.id, actor.id);
        await outfitRepository.removeContributorFromSnapshots(tx, outfit.id, actor.id);
        if (outfit.conversationId) {
          await buildChatService.removeMember(tx, outfit.conversationId, actor, actor);
        }
        return { eventType: OutfitEventType.MEMBER_LEFT, payload: { userId: actor.id } };
      },
    });
  },

  transferOwnership(
    call: OutfitWriteCall,
    { userId }: TransferOwnershipBody,
  ): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.TRANSFER_OWNERSHIP, { userId }),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor }) => {
        const newOwnerRole = await outfitRepository.findMemberRole(tx, outfit.id, userId);
        if (newOwnerRole !== OutfitMemberRole.EDITOR) throw outfitErrors.memberNotFound();

        await outfitRepository.setMemberRole(tx, outfit.id, actor.id, OutfitMemberRole.EDITOR);
        await outfitRepository.setMemberRole(tx, outfit.id, userId, OutfitMemberRole.OWNER);
        return {
          eventType: OutfitEventType.OWNERSHIP_TRANSFERRED,
          payload: { fromUserId: actor.id, toUserId: userId },
        };
      },
    });
  },
};
