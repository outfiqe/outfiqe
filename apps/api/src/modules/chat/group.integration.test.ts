import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  ConversationMemberRole,
  ConversationType,
  MessageKind,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import { CHAT_SYSTEM_EVENT } from "./chat.constants.js";

const SMALL_GROUP_LIMIT = 4;
const MAX_GROUP_MEMBERS_SETTING = "chat.maxGroupMembers";

type TestUser = { id: string; name: string; role: UserRole; auth: string };

beforeEach(async () => {
  await redis.flushdb();
  vi.restoreAllMocks();
  platformSettingsService.invalidate();
});

const createUser = async (name: string, role: UserRole = UserRole.CUSTOMER): Promise<TestUser> => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `group-${suffix}@outfiqe.test`,
      name,
      handle: `group-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role });
  return { id: user.id, name, role, auth: `Bearer ${accessToken}` };
};

const createGroup = (
  owner: TestUser,
  name: string,
  members: TestUser[],
  idempotencyKey: string = randomUUID(),
) =>
  request(testApp)
    .post("/api/conversations/groups")
    .set("Authorization", owner.auth)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .send({ name, memberIds: members.map(({ id }) => id) });

const createGroupOrFail = async (owner: TestUser, name: string, members: TestUser[]) => {
  const response = await createGroup(owner, name, members);
  expect(response.status).toBe(HTTP_STATUS.CREATED);
  return response.body.data.id as string;
};

const listMessages = (caller: TestUser, conversationId: string) =>
  request(testApp)
    .get(`/api/conversations/${conversationId}/messages`)
    .set("Authorization", caller.auth);

const addMembers = (caller: TestUser, conversationId: string, users: TestUser[]) =>
  request(testApp)
    .post(`/api/conversations/${conversationId}/members`)
    .set("Authorization", caller.auth)
    .send({ userIds: users.map(({ id }) => id) });

const removeMember = (caller: TestUser, conversationId: string, member: TestUser) =>
  request(testApp)
    .delete(`/api/conversations/${conversationId}/members/${member.id}`)
    .set("Authorization", caller.auth);

const changeRole = (
  caller: TestUser,
  conversationId: string,
  member: TestUser,
  role: ConversationMemberRole,
) =>
  request(testApp)
    .patch(`/api/conversations/${conversationId}/members/${member.id}`)
    .set("Authorization", caller.auth)
    .send({ role });

const leaveGroup = (caller: TestUser, conversationId: string) =>
  request(testApp)
    .post(`/api/conversations/${conversationId}/leave`)
    .set("Authorization", caller.auth);

const setGroupLimit = async (maxGroupMembers: number) => {
  await prisma.appSetting.create({
    data: { key: MAX_GROUP_MEMBERS_SETTING, value: maxGroupMembers },
  });
  platformSettingsService.invalidate();
};

const roleOf = async (conversationId: string, user: TestUser) =>
  (
    await prisma.conversationParticipant.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    })
  ).role;

describe("POST /api/conversations/groups", () => {
  it("creates a group with its creator as admin and opens with a 'created the group' line", async () => {
    const owner = await createUser("Sita");
    const ram = await createUser("Ram");
    const hari = await createUser("Hari");
    const publishSpy = vi.spyOn(eventBus, "publish");

    const response = await createGroup(owner, "Wedding looks", [ram, hari]);

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.data).toMatchObject({
      type: ConversationType.GROUP,
      otherParticipant: null,
      lastMessagePreview: "Sita created the group",
      group: { name: "Wedding looks", memberCount: 3, myRole: ConversationMemberRole.ADMIN },
    });

    const messages = await listMessages(ram, response.body.data.id);
    expect(messages.body.data.items).toEqual([
      expect.objectContaining({
        kind: MessageKind.SYSTEM,
        systemEvent: { type: CHAT_SYSTEM_EVENT.GROUP_CREATED, groupName: "Wedding looks" },
      }),
    ]);
    const createdBroadcast = publishSpy.mock.calls.find(
      ([event]) => event === DomainEvents.MESSAGE_CREATED,
    );
    expect(createdBroadcast?.[1]).toMatchObject({ recipientIds: [ram.id, hari.id] });
  });

  it("makes exactly one group when the same request is sent twice", async () => {
    const owner = await createUser("Twice Owner");
    const ram = await createUser("Twice Ram");
    const idempotencyKey = randomUUID();

    const first = await createGroup(owner, "Once", [ram], idempotencyKey);
    const second = await createGroup(owner, "Once", [ram], idempotencyKey);

    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await prisma.conversation.count({ where: { type: ConversationType.GROUP } })).toBe(1);
  });

  it("refuses people the creator can't reach, without saying why", async () => {
    const owner = await createUser("Blocked Owner");
    const blocker = await createUser("Blocker");
    const staff = await createUser("Tenant Staff", UserRole.TENANT_STAFF);
    const reachable = await createUser("Reachable");
    await prisma.chatBlock.create({ data: { blockerId: blocker.id, blockedId: owner.id } });

    const response = await createGroup(owner, "Nope", [reachable, blocker, staff]);

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("MEMBERS_UNREACHABLE");
    expect(response.body.details.unreachableUserIds.sort()).toEqual([blocker.id, staff.id].sort());
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("refuses a group bigger than the admin-set limit", async () => {
    await setGroupLimit(SMALL_GROUP_LIMIT);
    const owner = await createUser("Big Owner");
    const members = await Promise.all(
      Array.from({ length: SMALL_GROUP_LIMIT }, (_, index) => createUser(`Member ${index}`)),
    );

    const response = await createGroup(owner, "Too big", members);

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("GROUP_FULL");
  });

  it("needs at least one other person", async () => {
    const owner = await createUser("Lonely Owner");

    const response = await createGroup(owner, "Just me", [owner]);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.code).toBe("GROUP_NEEDS_MEMBERS");
  });
});

describe("managing a group", () => {
  it("lets only admins rename, add and remove", async () => {
    const owner = await createUser("Admin Owner");
    const member = await createUser("Plain Member");
    const outsider = await createUser("Outsider");
    const groupId = await createGroupOrFail(owner, "Admins only", [member]);

    const rename = await request(testApp)
      .patch(`/api/conversations/${groupId}`)
      .set("Authorization", member.auth)
      .send({ name: "Hijacked" });
    const add = await addMembers(member, groupId, [outsider]);
    const remove = await removeMember(member, groupId, owner);

    for (const response of [rename, add, remove]) {
      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(response.body.code).toBe("NOT_GROUP_ADMIN");
    }
  });

  it("renames the group and tells everyone", async () => {
    const owner = await createUser("Renamer");
    const member = await createUser("Rename Watcher");
    const groupId = await createGroupOrFail(owner, "Old name", [member]);

    const response = await request(testApp)
      .patch(`/api/conversations/${groupId}`)
      .set("Authorization", owner.auth)
      .send({ name: "New name" });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.group.name).toBe("New name");
    expect(response.body.data.lastMessagePreview).toBe('Renamer renamed the group to "New name"');
  });

  it("adds new people, ignores people already in the group, and names them in the event line", async () => {
    const owner = await createUser("Adder");
    const ram = await createUser("Ram Added");
    const sita = await createUser("Sita Added");
    const groupId = await createGroupOrFail(owner, "Growing", [ram]);

    const response = await addMembers(owner, groupId, [ram, sita]);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.members.map(({ id }: { id: string }) => id).sort()).toEqual(
      [owner.id, ram.id, sita.id].sort(),
    );
    const messages = await listMessages(owner, groupId);
    expect(messages.body.data.items[0].systemEvent).toEqual({
      type: CHAT_SYSTEM_EVENT.MEMBERS_ADDED,
      members: [{ id: sita.id, name: sita.name }],
    });
  });

  it("never goes over the limit when two admins add people at the same moment", async () => {
    await setGroupLimit(SMALL_GROUP_LIMIT);
    const owner = await createUser("Race Owner");
    const coAdmin = await createUser("Race Co-admin");
    const groupId = await createGroupOrFail(owner, "Race", [coAdmin]);
    await changeRole(owner, groupId, coAdmin, ConversationMemberRole.ADMIN);
    const firstPair = [await createUser("First A"), await createUser("First B")];
    const secondPair = [await createUser("Second A"), await createUser("Second B")];

    const outcomes = await Promise.all([
      addMembers(owner, groupId, firstPair),
      addMembers(coAdmin, groupId, secondPair),
    ]);

    expect(outcomes.map(({ status }) => status).sort()).toEqual([
      HTTP_STATUS.OK,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ]);
    expect(await prisma.conversationParticipant.count({ where: { conversationId: groupId } })).toBe(
      SMALL_GROUP_LIMIT,
    );
  });

  it("cuts a removed person off from the thread straight away", async () => {
    const owner = await createUser("Remover");
    const removed = await createUser("Removed Person");
    const stays = await createUser("Stays");
    const groupId = await createGroupOrFail(owner, "Removal", [removed, stays]);
    const publishSpy = vi.spyOn(eventBus, "publish");

    const response = await removeMember(owner, groupId, removed);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect((await listMessages(removed, groupId)).status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(publishSpy).toHaveBeenCalledWith(DomainEvents.CONVERSATION_MEMBER_REMOVED, {
      conversationId: groupId,
      userId: removed.id,
    });
  });

  it("points people to 'leave' instead of removing themselves", async () => {
    const owner = await createUser("Self Remover");
    const member = await createUser("Self Remover Friend");
    const groupId = await createGroupOrFail(owner, "Self removal", [member]);

    const response = await removeMember(owner, groupId, owner);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.code).toBe("USE_LEAVE_TO_EXIT");
  });

  it("won't let the only admin step down", async () => {
    const owner = await createUser("Only Admin");
    const member = await createUser("Only Admin Friend");
    const groupId = await createGroupOrFail(owner, "One admin", [member]);

    const response = await changeRole(owner, groupId, owner, ConversationMemberRole.MEMBER);

    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(response.body.code).toBe("LAST_GROUP_ADMIN");
    expect(await roleOf(groupId, owner)).toBe(ConversationMemberRole.ADMIN);
  });

  it("lets an admin step down once someone else is an admin, and says so in the thread", async () => {
    const owner = await createUser("Stepping Down");
    const member = await createUser("New Admin");
    const groupId = await createGroupOrFail(owner, "Handoff", [member]);
    await changeRole(owner, groupId, member, ConversationMemberRole.ADMIN);

    const response = await changeRole(owner, groupId, owner, ConversationMemberRole.MEMBER);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(await roleOf(groupId, owner)).toBe(ConversationMemberRole.MEMBER);
    expect(await roleOf(groupId, member)).toBe(ConversationMemberRole.ADMIN);
    const [latestLine] = (await listMessages(member, groupId)).body.data.items;
    expect(latestLine.systemEvent).toEqual({
      type: CHAT_SYSTEM_EVENT.ADMIN_REMOVED,
      member: { id: owner.id, name: owner.name },
    });
  });

  it("lets only admins change anyone's role", async () => {
    const owner = await createUser("Role Owner");
    const member = await createUser("Role Grabber");
    const groupId = await createGroupOrFail(owner, "No grabbing", [member]);

    const response = await changeRole(member, groupId, member, ConversationMemberRole.ADMIN);

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(await roleOf(groupId, member)).toBe(ConversationMemberRole.MEMBER);
  });

  it("hides a group's members from anyone outside it, and treats a direct chat as no group", async () => {
    const owner = await createUser("Private Owner");
    const member = await createUser("Private Member");
    const outsider = await createUser("Private Outsider");
    const groupId = await createGroupOrFail(owner, "Private", [member]);
    const direct = await request(testApp)
      .post("/api/conversations")
      .set("Authorization", owner.auth)
      .send({ userId: member.id });

    const asOutsider = await request(testApp)
      .get(`/api/conversations/${groupId}/members`)
      .set("Authorization", outsider.auth);
    const onDirectChat = await addMembers(owner, direct.body.data.id, [outsider]);

    expect(asOutsider.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(onDirectChat.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

describe("the last admin", () => {
  it("hands the admin role to the longest-standing member when they leave", async () => {
    const owner = await createUser("Leaving Admin");
    const first = await createUser("First Joined");
    const groupId = await createGroupOrFail(owner, "Handover", [first]);
    const later = await createUser("Later Joined");
    await addMembers(owner, groupId, [later]);

    const response = await leaveGroup(owner, groupId);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(await roleOf(groupId, first)).toBe(ConversationMemberRole.ADMIN);
    expect(await roleOf(groupId, later)).toBe(ConversationMemberRole.MEMBER);
  });

  it("deletes the group once everyone has left", async () => {
    const owner = await createUser("Last Out Owner");
    const member = await createUser("Last Out Member");
    const groupId = await createGroupOrFail(owner, "Empty soon", [member]);

    await leaveGroup(owner, groupId);
    await leaveGroup(member, groupId);

    expect(await prisma.conversation.findUnique({ where: { id: groupId } })).toBeNull();
  });
});

describe("messaging in a group", () => {
  it("shows the read tick only once every other member has read the message", async () => {
    const owner = await createUser("Tick Owner");
    const ram = await createUser("Tick Ram");
    const sita = await createUser("Tick Sita");
    const groupId = await createGroupOrFail(owner, "Ticks", [ram, sita]);
    await request(testApp)
      .post(`/api/conversations/${groupId}/messages`)
      .set("Authorization", owner.auth)
      .send({ body: "Blue or gold?" });

    const markRead = (reader: TestUser) =>
      request(testApp)
        .patch(`/api/conversations/${groupId}/read`)
        .set("Authorization", reader.auth);
    const isReadByOthers = async () =>
      (await listMessages(owner, groupId)).body.data.items.find(
        ({ kind }: { kind: MessageKind }) => kind === MessageKind.USER,
      ).isReadByOthers;

    await markRead(ram);
    expect(await isReadByOthers()).toBe(false);
    await markRead(sita);
    expect(await isReadByOthers()).toBe(true);
  });

  it("lets members send even when they have blocked someone else in the group", async () => {
    const owner = await createUser("Block Owner");
    const ram = await createUser("Block Ram");
    const sita = await createUser("Block Sita");
    const groupId = await createGroupOrFail(owner, "Mixed", [ram, sita]);
    await prisma.chatBlock.create({ data: { blockerId: ram.id, blockedId: sita.id } });

    const response = await request(testApp)
      .post(`/api/conversations/${groupId}/messages`)
      .set("Authorization", ram.auth)
      .send({ body: "Still here" });

    expect(response.status).toBe(HTTP_STATUS.OK);
    const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: groupId } });
    expect(conversation.lastMessagePreview).toBe("Block Ram: Still here");
  });

  it("stops a member who has turned their own chat off from sending", async () => {
    const owner = await createUser("Chat Off Owner");
    const ram = await createUser("Chat Off Ram");
    const groupId = await createGroupOrFail(owner, "Quiet", [ram]);
    await prisma.chatSettings.create({ data: { userId: ram.id, isChatEnabled: false } });

    const response = await request(testApp)
      .post(`/api/conversations/${groupId}/messages`)
      .set("Authorization", ram.auth)
      .send({ body: "Hello?" });

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("finds a group by its name in the conversation search", async () => {
    const owner = await createUser("Search Owner");
    const ram = await createUser("Search Ram");
    await createGroupOrFail(owner, "Dashain outfits", [ram]);

    const response = await request(testApp)
      .get("/api/conversations?q=dashain")
      .set("Authorization", ram.auth);

    expect(
      response.body.data.items.map(({ group }: { group: { name: string } }) => group.name),
    ).toEqual(["Dashain outfits"]);
  });
});
