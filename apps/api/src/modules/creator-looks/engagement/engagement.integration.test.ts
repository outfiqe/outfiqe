import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  authHeaderFor,
  createApprovedProduct,
  createCreator,
  createLook,
  createUserWithRole,
  tagProduct,
} from "#test/integration/creator-look-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
});

describe("POST /api/creator-looks/:lookId/like and unlike", () => {
  it("likes a drop and increments the like count", async () => {
    const creator = await createCreator("Like Target Muse", "like-target-creator");
    const viewer = await createCreator("Like Actor", "like-actor");
    const look = await createLook(creator.id, "Likeable drop");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: true, likeCount: 1 });
  });

  it("is idempotent when liking the same drop twice", async () => {
    const creator = await createCreator("Idempotent Like Muse", "idempotent-like-creator");
    const viewer = await createCreator("Idempotent Like Actor", "idempotent-like-actor");
    const look = await createLook(creator.id, "Double like target");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));
    const second = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.likeCount).toBe(1);
  });

  it("unlikes a previously liked drop and decrements the count", async () => {
    const creator = await createCreator("Unlike Target Muse", "unlike-target-creator");
    const viewer = await createCreator("Unlike Actor", "unlike-actor");
    const look = await createLook(creator.id, "Unlikeable drop");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));
    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: false, likeCount: 0 });
  });

  it("is a no-op unliking a drop that was never liked", async () => {
    const creator = await createCreator("Noop Unlike Muse", "noop-unlike-creator");
    const viewer = await createCreator("Noop Unlike Actor", "noop-unlike-actor");
    const look = await createLook(creator.id, "Never liked");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.likeCount).toBe(0);
  });

  it("returns 404 liking a drop that doesn't exist", async () => {
    const viewer = await createCreator("Missing Like Actor", "missing-like-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication to like", async () => {
    const response = await request(testApp).post(`/api/creator-looks/${randomUUID()}/like`);

    expect(response.status).toBe(401);
  });

  it("rejects a platform admin liking a drop", async () => {
    const creator = await createCreator("Admin Like Target Muse", "admin-like-target-creator");
    const admin = await createUserWithRole("Liking Admin", "liking-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Off-limits to staff");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_ENGAGE");

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.likeCount).toBe(0);
  });

  it("still allows a platform admin to unlike a drop from before this restriction shipped", async () => {
    const creator = await createCreator("Admin Unlike Target Muse", "admin-unlike-target-creator");
    const admin = await createUserWithRole("Unliking Admin", "unliking-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Legacy admin like");
    await prisma.creatorLook.update({ where: { id: look.id }, data: { likeCount: 1 } });
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: admin.id } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: false, likeCount: 0 });
  });
});

describe("POST /api/creator-looks/:lookId/save and unsave", () => {
  it("saves a drop and increments the save count", async () => {
    const creator = await createCreator("Save Target Muse", "save-target-creator");
    const viewer = await createCreator("Save Actor", "save-actor");
    const look = await createLook(creator.id, "Saveable drop");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ saved: true, saveCount: 1 });
  });

  it("is idempotent when saving the same drop twice", async () => {
    const creator = await createCreator("Idempotent Save Muse", "idempotent-save-creator");
    const viewer = await createCreator("Idempotent Save Actor", "idempotent-save-actor");
    const look = await createLook(creator.id, "Double save target");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));
    const second = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.saveCount).toBe(1);
  });

  it("unsaves a previously saved drop and decrements the count", async () => {
    const creator = await createCreator("Unsave Target Muse", "unsave-target-creator");
    const viewer = await createCreator("Unsave Actor", "unsave-actor");
    const look = await createLook(creator.id, "Unsaveable drop");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));
    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ saved: false, saveCount: 0 });
  });

  it("is a no-op unsaving a drop that was never saved", async () => {
    const creator = await createCreator("Noop Unsave Muse", "noop-unsave-creator");
    const viewer = await createCreator("Noop Unsave Actor", "noop-unsave-actor");
    const look = await createLook(creator.id, "Never saved");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.saveCount).toBe(0);
  });

  it("returns 404 saving a drop that doesn't exist", async () => {
    const viewer = await createCreator("Missing Save Actor", "missing-save-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication to save", async () => {
    const response = await request(testApp).post(`/api/creator-looks/${randomUUID()}/save`);

    expect(response.status).toBe(401);
  });

  it("allows a platform admin to save and unsave a drop, unlike/comment/like", async () => {
    const creator = await createCreator("Admin Save Target Muse", "admin-save-target-creator");
    const admin = await createUserWithRole("Saving Admin", "saving-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Admins can still bookmark this");

    const saveResponse = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.data).toEqual({ saved: true, saveCount: 1 });

    const unsaveResponse = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(unsaveResponse.status).toBe(200);
    expect(unsaveResponse.body.data).toEqual({ saved: false, saveCount: 0 });
  });
});

describe("POST /api/creator-looks/:lookId/tags/:productId/click", () => {
  it("records a tag click for an anonymous viewer", async () => {
    const creator = await createCreator("Tag Click Muse", "tag-click-creator");
    const product = await createApprovedProduct("Clickable Sneakers");
    const look = await createLook(creator.id, "Tag click target");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({ sessionId: randomUUID(), source: "FEED" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ recorded: true });

    const stored = await prisma.creatorLookTagClick.findFirst({
      where: { creatorLookId: look.id, productId: product.id },
    });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBeNull();
  });

  it("records the viewer id when the caller is authenticated", async () => {
    const creator = await createCreator("Auth Tag Click Muse", "auth-tag-click-creator");
    const viewer = await createCreator("Tag Click Viewer", "tag-click-viewer");
    const product = await createApprovedProduct("Auth Clickable Bag");
    const look = await createLook(creator.id, "Auth tag click target");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .set("Authorization", authHeaderFor(viewer.id))
      .send({ sessionId: randomUUID(), source: "PRODUCT_PAGE" });

    expect(response.status).toBe(200);

    const stored = await prisma.creatorLookTagClick.findFirst({
      where: { creatorLookId: look.id, productId: product.id },
    });
    expect(stored?.userId).toBe(viewer.id);
    expect(stored?.source).toBe("PRODUCT_PAGE");
  });

  it("returns 404 for a drop that doesn't exist", async () => {
    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/tags/${randomUUID()}/click`)
      .send({ sessionId: randomUUID() });

    expect(response.status).toBe(404);
  });

  it("returns 404 when the product isn't tagged in this look", async () => {
    const creator = await createCreator("Untagged Click Muse", "untagged-click-creator");
    const product = await createApprovedProduct("Untagged Product");
    const look = await createLook(creator.id, "No tags here");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({ sessionId: randomUUID() });

    expect(response.status).toBe(404);
  });

  it("rejects a missing sessionId", async () => {
    const creator = await createCreator("Missing Session Muse", "missing-session-creator");
    const product = await createApprovedProduct("Missing Session Product");
    const look = await createLook(creator.id, "Missing session target");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({});

    expect(response.status).toBe(422);
  });
});
