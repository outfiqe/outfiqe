import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  authHeaderFor,
  createContentModerator,
  createCreator,
  createLook,
  createUserWithRole,
} from "#test/integration/creator-look-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
});

describe("GET and POST /api/creator-looks/:lookId/comments", () => {
  it("adds a comment and increments the comment count", async () => {
    const creator = await createCreator("Comment Target Muse", "comment-target-creator");
    const commenter = await createCreator("Commenter", "commenter");
    const look = await createLook(creator.id, "Commentable drop");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Great fit!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ body: "Great fit!", userId: commenter.id });

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.commentCount).toBe(1);
  });

  it("lists comments oldest first with cursor pagination", async () => {
    const creator = await createCreator("Comment List Muse", "comment-list-creator");
    const commenter = await createCreator("Comment Lister", "comment-lister");
    const look = await createLook(creator.id, "Comment list target");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "First comment" });
    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Second comment" });

    const first = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments`)
      .query({ limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.comments[0].body).toBe("First comment");
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments`)
      .query({ limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.comments[0].body).toBe("Second comment");
  });

  it("returns an empty page when there are no comments", async () => {
    const creator = await createCreator("Empty Comments Muse", "empty-comments-creator");
    const look = await createLook(creator.id, "No comments yet");

    const response = await request(testApp).get(`/api/creator-looks/${look.id}/comments`);

    expect(response.status).toBe(200);
    expect(response.body.data.comments).toEqual([]);
  });

  it("returns 404 commenting on a drop that doesn't exist", async () => {
    const commenter = await createCreator("Missing Comment Actor", "missing-comment-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Ghost comment" });

    expect(response.status).toBe(404);
  });

  it("returns 404 listing comments on a drop that doesn't exist", async () => {
    const response = await request(testApp).get(`/api/creator-looks/${randomUUID()}/comments`);

    expect(response.status).toBe(404);
  });

  it("requires authentication to comment", async () => {
    const creator = await createCreator("Auth Comment Muse", "auth-comment-creator");
    const look = await createLook(creator.id, "Needs auth to comment");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .send({ body: "Anonymous comment" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty comment body", async () => {
    const creator = await createCreator("Empty Body Muse", "empty-body-creator");
    const commenter = await createCreator("Empty Body Commenter", "empty-body-commenter");
    const look = await createLook(creator.id, "Empty body target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "" });

    expect(response.status).toBe(422);
  });

  it("rejects a platform admin commenting on a drop", async () => {
    const creator = await createCreator(
      "Admin Comment Target Muse",
      "admin-comment-target-creator",
    );
    const admin = await createUserWithRole("Commenting Admin", "commenting-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Off-limits comment target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .send({ body: "Nice fit" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_ENGAGE");

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.commentCount).toBe(0);
  });
});

describe("DELETE /api/creator-looks/:lookId/comments/:commentId", () => {
  it("lets a comment's own author delete it", async () => {
    const creator = await createCreator("Comment Delete Muse", "comment-delete-creator");
    const commenter = await createCreator("Comment Deleter", "comment-deleter");
    const look = await createLook(creator.id, "Comment gets deleted");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Oops, deleting this" },
    });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { commentCount: 1 } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(commenter.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deleted: true });

    const stored = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(stored.deletedAt).not.toBeNull();

    const storedLook = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(storedLook.commentCount).toBe(0);
  });

  it("returns 404 for a non-owner, non-moderator caller", async () => {
    const creator = await createCreator("Protected Comment Muse", "protected-comment-creator");
    const commenter = await createCreator("Protected Commenter", "protected-commenter");
    const outsider = await createCreator("Comment Outsider", "comment-outsider");
    const look = await createLook(creator.id, "Comment stays");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Not yours to delete" },
    });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);

    const stored = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(stored.deletedAt).toBeNull();
  });

  it("lets a platform moderator delete someone else's comment and logs it", async () => {
    const creator = await createCreator("Moderated Comment Muse", "moderated-comment-creator");
    const commenter = await createCreator("Moderated Commenter", "moderated-commenter");
    const moderator = await createContentModerator(
      "Comment Moderator",
      "content-moderator-comment",
    );
    const look = await createLook(creator.id, "Comment removed by staff");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Reported comment" },
    });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(moderator.id, UserRole.ADMIN));

    expect(response.status).toBe(200);

    const auditLog = await prisma.platformAuditLog.findFirst({
      where: { targetType: "CreatorLookComment", targetId: comment.id },
    });
    expect(auditLog).toMatchObject({
      actorUserId: moderator.id,
      onBehalfOfUserId: commenter.id,
      action: PLATFORM_AUDIT_ACTION.CREATOR_LOOK_COMMENT_REMOVED_BY_ADMIN,
    });
  });

  it("returns 404 for a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Comment Muse", "missing-comment-creator");
    const look = await createLook(creator.id, "No such comment");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${randomUUID()}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(404);
  });

  it("cascades to every reply when a top-level comment is deleted", async () => {
    const creator = await createCreator("Cascade Muse", "cascade-creator");
    const commenter = await createCreator("Cascade Commenter", "cascade-commenter");
    const replier = await createCreator("Cascade Replier", "cascade-replier");
    const look = await createLook(creator.id, "Cascade target");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Parent comment" },
    });
    const replyOne = await prisma.creatorLookComment.create({
      data: {
        creatorLookId: look.id,
        userId: replier.id,
        parentCommentId: comment.id,
        body: "First reply",
      },
    });
    const replyTwo = await prisma.creatorLookComment.create({
      data: {
        creatorLookId: look.id,
        userId: replier.id,
        parentCommentId: comment.id,
        body: "Second reply",
      },
    });
    await prisma.creatorLookComment.update({
      where: { id: comment.id },
      data: { replyCount: 2 },
    });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { commentCount: 3 } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(commenter.id));

    expect(response.status).toBe(200);

    const [storedComment, storedReplyOne, storedReplyTwo, storedLook] = await Promise.all([
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: comment.id } }),
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: replyOne.id } }),
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: replyTwo.id } }),
      prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } }),
    ]);
    expect(storedComment.deletedAt).not.toBeNull();
    expect(storedReplyOne.deletedAt).not.toBeNull();
    expect(storedReplyTwo.deletedAt).not.toBeNull();
    expect(storedLook.commentCount).toBe(0);
  });

  it("deleting a single reply only decrements the parent's reply count by one", async () => {
    const creator = await createCreator("Single Reply Muse", "single-reply-creator");
    const commenter = await createCreator("Single Reply Commenter", "single-reply-commenter");
    const replier = await createCreator("Single Replier", "single-replier");
    const look = await createLook(creator.id, "Single reply target");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Parent stays" },
    });
    const reply = await prisma.creatorLookComment.create({
      data: {
        creatorLookId: look.id,
        userId: replier.id,
        parentCommentId: comment.id,
        body: "Reply goes away",
      },
    });
    await prisma.creatorLookComment.update({ where: { id: comment.id }, data: { replyCount: 1 } });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { commentCount: 2 } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${reply.id}`)
      .set("Authorization", authHeaderFor(replier.id));

    expect(response.status).toBe(200);

    const [storedReply, storedParent, storedLook] = await Promise.all([
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: reply.id } }),
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: comment.id } }),
      prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } }),
    ]);
    expect(storedReply.deletedAt).not.toBeNull();
    expect(storedParent.deletedAt).toBeNull();
    expect(storedParent.replyCount).toBe(0);
    expect(storedLook.commentCount).toBe(1);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).delete(
      `/api/creator-looks/${randomUUID()}/comments/${randomUUID()}`,
    );

    expect(response.status).toBe(401);
  });
});

describe("POST /api/creator-looks/:lookId/comments/:commentId/replies", () => {
  it("rejects a platform admin replying to a comment", async () => {
    const creator = await createCreator("Admin Reply Target Muse", "admin-reply-target-creator");
    const commenter = await createCreator("Reply Thread Starter", "reply-thread-starter");
    const admin = await createUserWithRole("Replying Admin", "replying-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Off-limits reply target");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Starting a thread" },
    });

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${comment.id}/replies`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .send({ body: "Staff reply" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_ENGAGE");
  });
});

describe("GET and POST /api/creator-looks/:lookId/comments/:commentId/replies", () => {
  const postComment = async (lookId: string, userId: string, body: string) => {
    const response = await request(testApp)
      .post(`/api/creator-looks/${lookId}/comments`)
      .set("Authorization", authHeaderFor(userId))
      .send({ body });
    return response.body.data.id as string;
  };

  it("adds a reply, increments the parent's reply count, and the look's comment count", async () => {
    const creator = await createCreator("Reply Target Muse", "reply-target-creator");
    const commenter = await createCreator("Reply Thread Starter", "reply-thread-starter");
    const replier = await createCreator("Reply Author", "reply-author");
    const look = await createLook(creator.id, "Reply target drop");
    const commentId = await postComment(look.id, commenter.id, "Great fit!");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Totally agree!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      parentCommentId: commentId,
      body: "Totally agree!",
      userId: replier.id,
    });

    const parentComment = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: commentId },
    });
    expect(parentComment.replyCount).toBe(1);

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.commentCount).toBe(2);
  });

  it("surfaces reply count and a preview of replies when listing top-level comments", async () => {
    const creator = await createCreator("Preview Reply Muse", "preview-reply-creator");
    const commenter = await createCreator("Preview Reply Commenter", "preview-reply-commenter");
    const replier = await createCreator("Preview Reply Replier", "preview-reply-replier");
    const look = await createLook(creator.id, "Preview reply target");
    const commentId = await postComment(look.id, commenter.id, "Nice look");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "First reply" });

    const response = await request(testApp).get(`/api/creator-looks/${look.id}/comments`);

    expect(response.status).toBe(200);
    const comment = response.body.data.comments[0];
    expect(comment.replyCount).toBe(1);
    expect(comment.previewReplies).toHaveLength(1);
    expect(comment.previewReplies[0]).toMatchObject({
      body: "First reply",
      parentCommentId: commentId,
    });
  });

  it("lists replies oldest first with cursor pagination", async () => {
    const creator = await createCreator("Reply List Muse", "reply-list-creator");
    const commenter = await createCreator("Reply List Commenter", "reply-list-commenter");
    const replier = await createCreator("Reply List Replier", "reply-list-replier");
    const look = await createLook(creator.id, "Reply list target");
    const commentId = await postComment(look.id, commenter.id, "Original comment");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "First reply" });
    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Second reply" });

    const first = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .query({ limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.replies[0].body).toBe("First reply");
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .query({ limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.replies[0].body).toBe("Second reply");
  });

  it("rejects replying to a reply, keeping threads exactly one level deep", async () => {
    const creator = await createCreator("Nested Reply Muse", "nested-reply-creator");
    const commenter = await createCreator("Nested Reply Commenter", "nested-reply-commenter");
    const replier = await createCreator("Nested Reply Replier", "nested-reply-replier");
    const nestedReplier = await createCreator("Nested Reply Second", "nested-reply-second");
    const look = await createLook(creator.id, "Nested reply target");
    const commentId = await postComment(look.id, commenter.id, "Top-level comment");

    const replyResponse = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "A reply" });
    const replyId = replyResponse.body.data.id as string;

    const nestedResponse = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${replyId}/replies`)
      .set("Authorization", authHeaderFor(nestedReplier.id))
      .send({ body: "A reply to a reply" });

    expect(nestedResponse.status).toBe(422);
  });

  it("returns 404 replying to a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Reply Muse", "missing-reply-creator");
    const replier = await createCreator("Missing Reply Author", "missing-reply-author");
    const look = await createLook(creator.id, "Missing reply target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${randomUUID()}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Ghost reply" });

    expect(response.status).toBe(404);
  });

  it("returns 404 listing replies for a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Reply List Muse", "missing-reply-list-creator");
    const look = await createLook(creator.id, "Missing reply list target");

    const response = await request(testApp).get(
      `/api/creator-looks/${look.id}/comments/${randomUUID()}/replies`,
    );

    expect(response.status).toBe(404);
  });

  it("requires authentication to reply", async () => {
    const creator = await createCreator("Auth Reply Muse", "auth-reply-creator");
    const commenter = await createCreator("Auth Reply Commenter", "auth-reply-commenter");
    const look = await createLook(creator.id, "Needs auth to reply");
    const commentId = await postComment(look.id, commenter.id, "Needs a reply");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .send({ body: "Anonymous reply" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty reply body", async () => {
    const creator = await createCreator("Empty Reply Muse", "empty-reply-creator");
    const commenter = await createCreator("Empty Reply Commenter", "empty-reply-commenter");
    const replier = await createCreator("Empty Reply Author", "empty-reply-author");
    const look = await createLook(creator.id, "Empty reply target");
    const commentId = await postComment(look.id, commenter.id, "Needs a reply");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "" });

    expect(response.status).toBe(422);
  });
});
