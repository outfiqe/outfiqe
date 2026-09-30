import type { Prisma } from "#generated/prisma/client.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";

import { CHAT_SYSTEM_EVENT, OUTFIT_CARD_PREVIEW_TEXT } from "./chat.constants.js";
import { groupRepository } from "./group.repository.js";
import { messageRepository } from "./message.repository.js";
import type { ChatMemberReference, ChatSystemEvent } from "./message.schemas.js";
import { describeSystemEvent } from "./message.utils.js";

const writeAnnouncedSystemMessage = async (
  tx: Prisma.TransactionClient,
  conversationId: string,
  actor: ChatMemberReference,
  systemEvent: ChatSystemEvent,
): Promise<void> => {
  const message = await messageRepository.createSystemMessage(tx, {
    conversationId,
    actorId: actor.id,
    systemEvent,
    preview: describeSystemEvent(systemEvent, actor.name),
  });
  const memberIds = await groupRepository.listMemberIds(tx, conversationId);
  await enqueueOutboxEvent(tx, {
    topic: OUTBOX_TOPIC.CHAT_MESSAGE_CREATED,
    aggregateId: conversationId,
    payload: {
      messageId: message.id,
      recipientIds: memberIds.filter((memberId) => memberId !== actor.id),
    },
  });
};

export const buildChatService = {
  async createForBuild(
    tx: Prisma.TransactionClient,
    { name, owner, editorIds }: { name: string; owner: ChatMemberReference; editorIds: string[] },
  ): Promise<string> {
    const { id: conversationId } = await groupRepository.create(tx, {
      name,
      createdById: owner.id,
      memberIds: editorIds,
    });
    await writeAnnouncedSystemMessage(tx, conversationId, owner, {
      type: CHAT_SYSTEM_EVENT.GROUP_CREATED,
      groupName: name,
    });
    return conversationId;
  },

  async addMembers(
    tx: Prisma.TransactionClient,
    conversationId: string,
    actor: ChatMemberReference,
    userIds: string[],
  ): Promise<void> {
    const existingMemberIds = await groupRepository.listMemberIds(tx, conversationId);
    const newMemberIds = userIds.filter((userId) => !existingMemberIds.includes(userId));
    if (newMemberIds.length === 0) return;

    await groupRepository.addMembers(tx, conversationId, newMemberIds);
    await writeAnnouncedSystemMessage(tx, conversationId, actor, {
      type: CHAT_SYSTEM_EVENT.OUTFIT_EDITORS_ADDED,
      members: await groupRepository.findMemberReferences(newMemberIds),
    });
  },

  async postBuildCard(
    tx: Prisma.TransactionClient,
    {
      conversationId,
      sender,
      outfitId,
    }: {
      conversationId: string;
      sender: ChatMemberReference;
      outfitId: string;
    },
  ): Promise<void> {
    const cardMessage = await messageRepository.createOutfitCard(tx, {
      conversationId,
      senderId: sender.id,
      outfitId,
      preview: `${sender.name}: ${OUTFIT_CARD_PREVIEW_TEXT.toLowerCase()}`,
    });
    const memberIds = await groupRepository.listMemberIds(tx, conversationId);
    await enqueueOutboxEvent(tx, {
      topic: OUTBOX_TOPIC.CHAT_MESSAGE_CREATED,
      aggregateId: conversationId,
      payload: {
        messageId: cardMessage.id,
        recipientIds: memberIds.filter((memberId) => memberId !== sender.id),
      },
    });
  },

  async announceBuildChange(
    tx: Prisma.TransactionClient,
    conversationId: string,
    actor: ChatMemberReference,
    systemEvent: ChatSystemEvent,
  ): Promise<void> {
    await writeAnnouncedSystemMessage(tx, conversationId, actor, systemEvent);
  },

  async removeMember(
    tx: Prisma.TransactionClient,
    conversationId: string,
    actor: ChatMemberReference,
    removedMember: ChatMemberReference,
  ): Promise<void> {
    const membership = await groupRepository.findMember(tx, conversationId, removedMember.id);
    if (!membership) return;

    await groupRepository.removeMember(tx, conversationId, removedMember.id);
    const isLeaving = actor.id === removedMember.id;
    await writeAnnouncedSystemMessage(
      tx,
      conversationId,
      actor,
      isLeaving
        ? { type: CHAT_SYSTEM_EVENT.MEMBER_LEFT }
        : { type: CHAT_SYSTEM_EVENT.MEMBER_REMOVED, member: removedMember },
    );
    await enqueueOutboxEvent(tx, {
      topic: OUTBOX_TOPIC.CHAT_MEMBER_REMOVED,
      aggregateId: conversationId,
      payload: { conversationId, userId: removedMember.id },
    });
  },

  async rename(
    tx: Prisma.TransactionClient,
    conversationId: string,
    actor: ChatMemberReference,
    name: string,
  ): Promise<void> {
    await groupRepository.rename(tx, conversationId, name);
    await writeAnnouncedSystemMessage(tx, conversationId, actor, {
      type: CHAT_SYSTEM_EVENT.GROUP_RENAMED,
      groupName: name,
    });
  },
};
