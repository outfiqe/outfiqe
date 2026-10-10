import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { Prisma } from "#generated/prisma/client.js";
import { ConversationMemberRole, ConversationType } from "#generated/prisma/enums.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { CHAT_SYSTEM_EVENT, CREATE_GROUP_IDEMPOTENCY_ENDPOINT } from "../chat.constants.js";
import { chatService } from "../chat.service.js";
import { chatUnavailableError } from "../chat.utils.js";
import { conversationService } from "../conversations/conversation.service.js";
import type { ConversationPreview } from "../conversations/conversation.types.js";
import { messageRepository } from "../messages/message.repository.js";
import type { ChatMemberReference, ChatSystemEvent } from "../messages/message.schemas.js";
import { describeSystemEvent, toMessageBroadcast } from "../messages/message.utils.js";
import { groupRepository } from "./group.repository.js";
import type { CreateGroupBody } from "./group.schemas.js";
import type { GroupMembersView } from "./group.types.js";
import { toConversationMemberView } from "./group.utils.js";

const GROUP_CREATOR_COUNT = 1;
const NO_MEMBERS_LEFT = 0;
const NO_ADMINS_LEFT = 0;
const MINIMUM_ADMIN_COUNT = 1;

type SystemMessage = Awaited<ReturnType<typeof messageRepository.createSystemMessage>>;
type PendingBroadcast = { message: SystemMessage; recipientIds: string[] };

const groupNotFound = () =>
  new AppError("GROUP_NOT_FOUND", "Group not found.", HTTP_STATUS.NOT_FOUND);

const dedupeOtherIds = (callerId: string, userIds: string[]): string[] =>
  [...new Set(userIds)].filter((userId) => userId !== callerId);

const requireGroupMembership = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  callerId: string,
) => {
  const lockedConversation = await groupRepository.lockConversation(tx, conversationId);
  if (!lockedConversation || lockedConversation.type !== ConversationType.GROUP) {
    throw groupNotFound();
  }
  const callerMember = await groupRepository.findMember(tx, conversationId, callerId);
  if (!callerMember) throw groupNotFound();
  if (await groupRepository.isBuildChat(tx, conversationId)) {
    throw new AppError(
      "BUILD_CHAT_MANAGED_BY_BUILD",
      "This chat belongs to an outfit build. Change who is in it from the build instead.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return callerMember;
};

const requireGroupAdmin = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  callerId: string,
) => {
  const callerMember = await requireGroupMembership(tx, conversationId, callerId);
  if (callerMember.role !== ConversationMemberRole.ADMIN) {
    throw new AppError("NOT_GROUP_ADMIN", "Only a group admin can do that.", HTTP_STATUS.FORBIDDEN);
  }
  return callerMember;
};

const requireOtherMember = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  userId: string,
) => {
  const member = await groupRepository.findMember(tx, conversationId, userId);
  if (!member) {
    throw new AppError(
      "MEMBER_NOT_FOUND",
      "That person isn't in this group.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  return member;
};

const assertReachable = async (callerId: string, userIds: string[]): Promise<void> => {
  const ownAvailability = await chatService.resolveOwnChatAvailability(callerId);
  if (!ownAvailability.isAvailable) throw chatUnavailableError(ownAvailability.reason);

  const availabilities = await Promise.all(
    userIds.map((userId) => chatService.resolveChatAvailability(callerId, userId)),
  );
  const unreachableUserIds = userIds.filter((_, index) => !availabilities[index]?.isAvailable);
  if (unreachableUserIds.length > 0) {
    throw new AppError(
      "MEMBERS_UNREACHABLE",
      "Some of these people can't be added to a group right now.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      { unreachableUserIds },
    );
  }
};

const assertWithinMemberLimit = async (memberCount: number): Promise<void> => {
  const maxGroupMembers = await platformSettingsService.get("chat.maxGroupMembers");
  if (memberCount > maxGroupMembers) {
    throw new AppError(
      "GROUP_FULL",
      `A group can have at most ${maxGroupMembers} people.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }
};

const writeSystemMessage = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  actor: ChatMemberReference,
  systemEvent: ChatSystemEvent,
): Promise<SystemMessage> =>
  messageRepository.createSystemMessage(tx, {
    conversationId,
    actorId: actor.id,
    systemEvent,
    preview: describeSystemEvent(systemEvent, actor.name),
  });

const broadcast = async ({ message, recipientIds }: PendingBroadcast): Promise<void> => {
  await eventBus.publish(DomainEvents.MESSAGE_CREATED, toMessageBroadcast(message, recipientIds));
};

const announceRemoval = async (conversationId: string, userId: string): Promise<void> => {
  await eventBus.publish(DomainEvents.CONVERSATION_MEMBER_REMOVED, { conversationId, userId });
};

const toMemberReference = ({ user }: { user: ChatMemberReference }): ChatMemberReference => ({
  id: user.id,
  name: user.name,
});

const listMembersView = async (conversationId: string): Promise<GroupMembersView> => ({
  members: (await groupRepository.listMembers(prisma, conversationId)).map(
    toConversationMemberView,
  ),
});

const createGroupOnce = async (
  callerId: string,
  { name, memberIds }: CreateGroupBody,
): Promise<ConversationPreview> => {
  const otherMemberIds = dedupeOtherIds(callerId, memberIds);
  if (otherMemberIds.length === 0) {
    throw new AppError(
      "GROUP_NEEDS_MEMBERS",
      "Add at least one other person to the group.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  await assertWithinMemberLimit(otherMemberIds.length + GROUP_CREATOR_COUNT);
  await assertReachable(callerId, otherMemberIds);
  const [actor] = await groupRepository.findMemberReferences([callerId]);
  if (!actor) throw groupNotFound();

  const pendingBroadcast = await prisma.$transaction(async (tx) => {
    const { id } = await groupRepository.create(tx, {
      name,
      createdById: callerId,
      memberIds: otherMemberIds,
    });
    const message = await writeSystemMessage(tx, id, actor, {
      type: CHAT_SYSTEM_EVENT.GROUP_CREATED,
      groupName: name,
    });
    return { message, recipientIds: otherMemberIds };
  });

  await broadcast(pendingBroadcast);
  return conversationService.getConversation(callerId, pendingBroadcast.message.conversationId);
};

export const groupService = {
  createGroup(
    callerId: string,
    body: CreateGroupBody,
    idempotencyKey: string | undefined,
  ): Promise<ConversationPreview> {
    return withIdempotency(
      callerId,
      CREATE_GROUP_IDEMPOTENCY_ENDPOINT,
      idempotencyKey,
      () => createGroupOnce(callerId, body),
      body,
    );
  },

  async renameGroup(
    callerId: string,
    conversationId: string,
    name: string,
  ): Promise<ConversationPreview> {
    const pendingBroadcast = await prisma.$transaction(async (tx) => {
      const callerMember = await requireGroupAdmin(tx, conversationId, callerId);
      await groupRepository.rename(tx, conversationId, name);
      const message = await writeSystemMessage(
        tx,
        conversationId,
        toMemberReference(callerMember),
        {
          type: CHAT_SYSTEM_EVENT.GROUP_RENAMED,
          groupName: name,
        },
      );
      const memberIds = await groupRepository.listMemberIds(tx, conversationId);
      return { message, recipientIds: dedupeOtherIds(callerId, memberIds) };
    });

    await broadcast(pendingBroadcast);
    return conversationService.getConversation(callerId, conversationId);
  },

  async listMembers(callerId: string, conversationId: string): Promise<GroupMembersView> {
    const [conversationType, callerMember] = await Promise.all([
      groupRepository.findConversationType(conversationId),
      groupRepository.findMember(prisma, conversationId, callerId),
    ]);
    if (conversationType !== ConversationType.GROUP || !callerMember) throw groupNotFound();
    return listMembersView(conversationId);
  },

  async addMembers(
    callerId: string,
    conversationId: string,
    userIds: string[],
  ): Promise<GroupMembersView> {
    const requestedIds = dedupeOtherIds(callerId, userIds);
    await assertReachable(callerId, requestedIds);

    const pendingBroadcast = await prisma.$transaction(async (tx) => {
      const callerMember = await requireGroupAdmin(tx, conversationId, callerId);
      const existingMemberIds = await groupRepository.listMemberIds(tx, conversationId);
      const newMemberIds = requestedIds.filter((userId) => !existingMemberIds.includes(userId));
      if (newMemberIds.length === 0) return null;

      await assertWithinMemberLimit(existingMemberIds.length + newMemberIds.length);
      await groupRepository.addMembers(tx, conversationId, newMemberIds);
      const message = await writeSystemMessage(
        tx,
        conversationId,
        toMemberReference(callerMember),
        {
          type: CHAT_SYSTEM_EVENT.MEMBERS_ADDED,
          members: await groupRepository.findMemberReferences(newMemberIds),
        },
      );
      return {
        message,
        recipientIds: dedupeOtherIds(callerId, [...existingMemberIds, ...newMemberIds]),
      };
    });

    if (pendingBroadcast) await broadcast(pendingBroadcast);
    return listMembersView(conversationId);
  },

  async removeMember(
    callerId: string,
    conversationId: string,
    userId: string,
  ): Promise<GroupMembersView> {
    if (userId === callerId) {
      throw new AppError(
        "USE_LEAVE_TO_EXIT",
        "To take yourself out of a group, leave it instead.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const pendingBroadcast = await prisma.$transaction(async (tx) => {
      const callerMember = await requireGroupAdmin(tx, conversationId, callerId);
      const removedMember = await requireOtherMember(tx, conversationId, userId);
      await groupRepository.removeMember(tx, conversationId, userId);
      const message = await writeSystemMessage(
        tx,
        conversationId,
        toMemberReference(callerMember),
        {
          type: CHAT_SYSTEM_EVENT.MEMBER_REMOVED,
          member: toMemberReference(removedMember),
        },
      );
      const remainingIds = await groupRepository.listMemberIds(tx, conversationId);
      return { message, recipientIds: dedupeOtherIds(callerId, remainingIds) };
    });

    await announceRemoval(conversationId, userId);
    await broadcast(pendingBroadcast);
    return listMembersView(conversationId);
  },

  async changeMemberRole(
    callerId: string,
    conversationId: string,
    userId: string,
    role: ConversationMemberRole,
  ): Promise<GroupMembersView> {
    const pendingBroadcast = await prisma.$transaction(async (tx) => {
      const callerMember = await requireGroupAdmin(tx, conversationId, callerId);
      const targetMember = await requireOtherMember(tx, conversationId, userId);
      if (targetMember.role === role) return null;

      const isDemotion = role === ConversationMemberRole.MEMBER;
      const adminCount = await groupRepository.countAdmins(tx, conversationId);
      if (isDemotion && adminCount <= MINIMUM_ADMIN_COUNT) {
        throw new AppError(
          "LAST_GROUP_ADMIN",
          "A group needs at least one admin. Make someone else an admin first.",
          HTTP_STATUS.CONFLICT,
        );
      }

      await groupRepository.setRole(tx, conversationId, userId, role);
      const message = await writeSystemMessage(
        tx,
        conversationId,
        toMemberReference(callerMember),
        {
          type: isDemotion ? CHAT_SYSTEM_EVENT.ADMIN_REMOVED : CHAT_SYSTEM_EVENT.ADMIN_ASSIGNED,
          member: toMemberReference(targetMember),
        },
      );
      const memberIds = await groupRepository.listMemberIds(tx, conversationId);
      return { message, recipientIds: dedupeOtherIds(callerId, memberIds) };
    });

    if (pendingBroadcast) await broadcast(pendingBroadcast);
    return listMembersView(conversationId);
  },

  async leaveGroup(callerId: string, conversationId: string): Promise<void> {
    const pendingBroadcast = await prisma.$transaction(async (tx) => {
      const callerMember = await requireGroupMembership(tx, conversationId, callerId);
      await groupRepository.removeMember(tx, conversationId, callerId);

      const remainingIds = await groupRepository.listMemberIds(tx, conversationId);
      if (remainingIds.length === NO_MEMBERS_LEFT) {
        await groupRepository.deleteConversation(tx, conversationId);
        return null;
      }

      const wasLastAdmin =
        callerMember.role === ConversationMemberRole.ADMIN &&
        (await groupRepository.countAdmins(tx, conversationId)) === NO_ADMINS_LEFT;
      if (wasLastAdmin) {
        const successorId = await groupRepository.findLongestStandingMemberId(tx, conversationId);
        if (successorId) {
          await groupRepository.setRole(
            tx,
            conversationId,
            successorId,
            ConversationMemberRole.ADMIN,
          );
        }
      }

      const message = await writeSystemMessage(
        tx,
        conversationId,
        toMemberReference(callerMember),
        {
          type: CHAT_SYSTEM_EVENT.MEMBER_LEFT,
        },
      );
      return { message, recipientIds: remainingIds };
    });

    await announceRemoval(conversationId, callerId);
    if (pendingBroadcast) await broadcast(pendingBroadcast);
  },
};
