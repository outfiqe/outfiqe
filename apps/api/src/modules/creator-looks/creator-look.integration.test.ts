import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, TagReviewStatus, UserRole } from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  authHeaderFor,
  createApprovedProduct,
  createContentModerator,
  createCreator,
  createImageAsset,
  createLook,
  createPendingProduct,
  createPlainUser,
  createUserWithRole,
  tagProduct,
} from "#test/integration/creator-look-fixtures.js";
import { overrideOutfitSetting } from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
});

describe("POST /api/creator-looks", () => {
  it("creates a look with tagged products and extracted hashtags", async () => {
    const creator = await createCreator("Drop Muse", "post-creator");
    const product = await createApprovedProduct("Denim Jacket");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg", "https://cdn.outfiqe.test/b.jpg"],
        caption: "Loving this #winter #layering fit",
        taggedProducts: [{ productId: product.id, sizeWorn: "M" }],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.taggedProducts).toHaveLength(1);
    expect(response.body.data.imageUrl).toBe("https://cdn.outfiqe.test/a.jpg");

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: response.body.data.id },
    });
    expect(hashtags.map((row) => row.tag).sort()).toEqual(["layering", "winter"]);

    const ownDetail = await request(testApp)
      .get(`/api/creator-looks/${response.body.data.id}`)
      .set("Authorization", authHeaderFor(creator.id));
    expect(ownDetail.body.data.imageUrls).toEqual([
      "https://cdn.outfiqe.test/a.jpg",
      "https://cdn.outfiqe.test/b.jpg",
    ]);

    const searchResponse = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: "Loving this" });
    expect(searchResponse.body.data.posts[0].images).toEqual([
      "https://cdn.outfiqe.test/a.jpg",
      "https://cdn.outfiqe.test/b.jpg",
    ]);
  });

  it("creates a look without a caption", async () => {
    const creator = await createCreator("Captionless Muse", "captionless-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/no-caption.jpg"], taggedProducts: [] });

    expect(response.status).toBe(201);
    expect(response.body.data.caption).toBeNull();

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: response.body.data.id },
    });
    expect(hashtags).toEqual([]);
  });

  it("defaults to a PORTRAIT layout when none is chosen", async () => {
    const creator = await createCreator("Default Layout Muse", "default-layout-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/default-layout.jpg"], taggedProducts: [] });

    expect(response.status).toBe(201);
    expect(response.body.data.layout).toBe("PORTRAIT");
  });

  it.each(["PORTRAIT", "SQUARE", "TALL"])(
    "persists and returns a %s layout chosen at creation",
    async (layout) => {
      const creator = await createCreator(`Layout Muse ${layout}`, `layout-creator-${layout}`);

      const response = await request(testApp)
        .post("/api/creator-looks")
        .set("Authorization", authHeaderFor(creator.id))
        .send({
          imageUrls: [`https://cdn.outfiqe.test/${layout}.jpg`],
          taggedProducts: [],
          layout,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.layout).toBe(layout);

      const stored = await prisma.creatorLook.findUniqueOrThrow({
        where: { id: response.body.data.id },
      });
      expect(stored.layout).toBe(layout);
    },
  );

  it("rejects a layout value outside the closed set", async () => {
    const creator = await createCreator("Invalid Layout Muse", "invalid-layout-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/invalid-layout.jpg"],
        taggedProducts: [],
        layout: "LANDSCAPE",
      });

    expect(response.status).toBe(422);
  });

  it("links the caller's uploaded image assets to the look's images by position", async () => {
    const creator = await createCreator("Asset Link Muse", "asset-link-creator");
    const asset = await createImageAsset(creator.id);

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/cover.jpg", "https://cdn.outfiqe.test/second.jpg"],
        imageAssetIds: [asset.id, null],
        taggedProducts: [],
      });

    expect(response.status).toBe(201);
    const images = await prisma.creatorLookImage.findMany({
      where: { creatorLookId: response.body.data.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(images.map((image) => image.imageAssetId)).toEqual([asset.id, null]);
  });

  it("rejects image assets owned by another user", async () => {
    const creator = await createCreator("Asset Owner Muse", "asset-owner-creator");
    const stranger = await createPlainUser("Stranger", "asset-stranger");
    const strangersAsset = await createImageAsset(stranger.id);

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/cover.jpg"],
        imageAssetIds: [strangersAsset.id],
        taggedProducts: [],
      });

    expect(response.status).toBe(404);
  });

  it("rejects an imageAssetIds list that does not line up with imageUrls", async () => {
    const creator = await createCreator("Asset Mismatch Muse", "asset-mismatch-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/cover.jpg", "https://cdn.outfiqe.test/second.jpg"],
        imageAssetIds: [randomUUID()],
        taggedProducts: [],
      });

    expect(response.status).toBe(422);
  });

  it("rejects a non-approved muse", async () => {
    const plainUser = await createPlainUser("Not A Muse", "post-not-a-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(plainUser.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [],
      });

    expect(response.status).toBe(403);
  });

  it("rejects a platform admin even if their row is already flagged as an approved muse", async () => {
    const corruptedAdmin = await createUserWithRole(
      "Corrupted Admin Muse",
      "corrupted-admin-creator",
      UserRole.ADMIN,
      { isCreator: true, creatorStatus: CreatorStatus.APPROVED },
    );

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(corruptedAdmin.id, UserRole.ADMIN))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/staff-post.jpg"],
        taggedProducts: [],
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("STAFF_CANNOT_BE_CREATOR");
  });

  it("rejects tagging a product that isn't approved", async () => {
    const creator = await createCreator("Rejected Tag Muse", "rejected-tag-creator");
    const pendingProduct = await createPendingProduct("Unapproved Hoodie");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [{ productId: pendingProduct.id, sizeWorn: "M" }],
      });

    expect(response.status).toBe(404);
  });

  it("rejects tagging a product that doesn't exist", async () => {
    const creator = await createCreator("Nonexistent Tag Muse", "nonexistent-tag-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [{ productId: randomUUID(), sizeWorn: "M" }],
      });

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .post("/api/creator-looks")
      .send({ imageUrls: ["https://cdn.outfiqe.test/a.jpg"], taggedProducts: [] });

    expect(response.status).toBe(401);
  });

  it("allows as many tagged products as a build can hold, and no more", async () => {
    const creator = await createCreator("Tag Limit Creator", "tag-limit-creator");
    const products = await Promise.all(
      ["Kurta", "Trousers", "Juttis"].map((name) => createApprovedProduct(name)),
    );
    const postWith = (taggedProductCount: number) =>
      request(testApp)
        .post("/api/creator-looks")
        .set("Authorization", authHeaderFor(creator.id))
        .send({
          imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
          taggedProducts: products
            .slice(0, taggedProductCount)
            .map((product) => ({ productId: product.id, sizeWorn: "M" })),
        });
    await overrideOutfitSetting("outfit.maxItemsPerBoard", 2);

    const overLimit = await postWith(3);
    const atLimit = await postWith(2);
    const limits = await request(testApp).get("/api/creator-looks/limits");

    expect(overLimit.status).toBe(422);
    expect(overLimit.body.code).toBe("TOO_MANY_TAGGED_PRODUCTS");
    expect(atLimit.status).toBe(201);
    expect(limits.body.data).toEqual({ maxTaggedProducts: 2 });
  });

  it("rejects an empty imageUrls array", async () => {
    const creator = await createCreator("Empty Images Muse", "empty-images-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: [], taggedProducts: [] });

    expect(response.status).toBe(422);
  });
});

describe("GET /api/creator-looks/:lookId", () => {
  it("returns the owner's own drop detail", async () => {
    const creator = await createCreator("Owner Getter", "owner-getter");
    const product = await createApprovedProduct("Getter Boots");
    const look = await createLook(creator.id, "My own drop");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(look.id);
    expect(response.body.data.taggedProducts).toHaveLength(1);
    expect(response.body.data.taggedProducts[0]).toMatchObject({
      reviewStatus: "APPROVED",
      rejectionReason: null,
      rejectionNote: null,
      canReRequest: false,
    });
  });

  it("surfaces a rejected tag's reason, note, and remaining re-request budget to the owner", async () => {
    const creator = await createCreator("Rejected Tag Owner", "rejected-tag-owner");
    const product = await createApprovedProduct("Contested Coat");
    const look = await createLook(creator.id, "Still up, tag under review");
    await prisma.creatorLookProduct.create({
      data: {
        creatorLookId: look.id,
        productId: product.id,
        sizeWorn: "M",
        reviewStatus: TagReviewStatus.REJECTED,
        rejectionReason: "MISREPRESENTS_PRODUCT",
        rejectionNote: "This isn't a current-season colourway.",
        reRequestCount: 3,
      },
    });

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.taggedProducts[0]).toMatchObject({
      reviewStatus: "REJECTED",
      rejectionReason: "MISREPRESENTS_PRODUCT",
      rejectionNote: "This isn't a current-season colourway.",
      canReRequest: false,
    });
  });

  it("returns 404 for a drop owned by someone else", async () => {
    const owner = await createCreator("Real Owner", "real-owner");
    const outsider = await createCreator("Outsider Viewer", "outsider-viewer");
    const look = await createLook(owner.id, "Not yours");

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a nonexistent drop", async () => {
    const creator = await createCreator("Missing Drop Viewer", "missing-post-viewer");

    const response = await request(testApp)
      .get(`/api/creator-looks/${randomUUID()}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const creator = await createCreator("Auth Required Owner", "auth-required-owner");
    const look = await createLook(creator.id, "Needs auth");

    const response = await request(testApp).get(`/api/creator-looks/${look.id}`);

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/creator-looks/:lookId", () => {
  it("updates a drop's images, caption, and tagged products", async () => {
    const creator = await createCreator("Update Muse", "update-creator");
    const originalProduct = await createApprovedProduct("Original Scarf");
    const newProduct = await createApprovedProduct("New Scarf");
    const look = await createLook(creator.id, "Before edit");
    await tagProduct(look.id, originalProduct.id);

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/updated.jpg"],
        caption: "After edit #refresh",
        taggedProducts: [{ productId: newProduct.id, sizeWorn: "L" }],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.imageUrl).toBe("https://cdn.outfiqe.test/updated.jpg");
    expect(response.body.data.taggedProducts.map((p: { id: string }) => p.id)).toEqual([
      newProduct.id,
    ]);

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: look.id },
    });
    expect(hashtags.map((row) => row.tag)).toEqual(["refresh"]);
  });

  it("clears the derived hashtags when the caption is omitted from the update", async () => {
    const creator = await createCreator("Caption Clear Muse", "caption-clear-creator");
    const look = await createLook(creator.id, "Had a caption #before");
    await prisma.creatorLookHashtag.create({ data: { creatorLookId: look.id, tag: "before" } });

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/no-caption.jpg"], taggedProducts: [] });

    expect(response.status).toBe(200);

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: look.id },
    });
    expect(hashtags).toEqual([]);
  });

  it("returns 404 for a drop owned by someone else", async () => {
    const owner = await createCreator("Update Real Owner", "update-real-owner");
    const outsider = await createCreator("Update Outsider", "update-outsider");
    const look = await createLook(owner.id, "Protected");

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/x.jpg"], taggedProducts: [] });

    expect(response.status).toBe(404);
  });

  it("rejects tagging a product that isn't approved", async () => {
    const creator = await createCreator("Update Reject Muse", "update-reject-creator");
    const pendingProduct = await createPendingProduct("Still Pending");
    const look = await createLook(creator.id, "Editable");

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/x.jpg"],
        taggedProducts: [{ productId: pendingProduct.id, sizeWorn: "M" }],
      });

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .patch(`/api/creator-looks/${randomUUID()}`)
      .send({ imageUrls: ["https://cdn.outfiqe.test/x.jpg"], taggedProducts: [] });

    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/creator-looks/:lookId", () => {
  it("soft-deletes the owner's drop", async () => {
    const creator = await createCreator("Delete Muse", "delete-creator");
    const look = await createLook(creator.id, "Going away");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deleted: true });

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.deletedAt).not.toBeNull();

    const afterDelete = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));
    expect(afterDelete.status).toBe(404);
  });

  it("returns 404 for a drop owned by someone else", async () => {
    const owner = await createCreator("Delete Real Owner", "delete-real-owner");
    const outsider = await createCreator("Delete Outsider", "delete-outsider");
    const look = await createLook(owner.id, "Protected from deletion");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a platform admin with no content-moderate permission", async () => {
    const owner = await createCreator("Unmoderated Owner", "unmoderated-owner");
    const bareAdmin = await createUserWithRole("Bare Admin", "bare-admin", UserRole.ADMIN);
    const look = await createLook(owner.id, "Still protected from a bare admin");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(bareAdmin.id, UserRole.ADMIN));

    expect(response.status).toBe(404);
  });

  it("lets a platform moderator delete another muse's drop and logs it", async () => {
    const owner = await createCreator("Moderated Owner", "moderated-owner");
    const moderator = await createContentModerator("Content Moderator", "content-moderator-look");
    const look = await createLook(owner.id, "About to be removed by staff");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(moderator.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deleted: true });

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.deletedAt).not.toBeNull();

    const auditLog = await prisma.platformAuditLog.findFirst({
      where: { targetType: "CreatorLook", targetId: look.id },
    });
    expect(auditLog).toMatchObject({
      actorUserId: moderator.id,
      onBehalfOfUserId: owner.id,
      action: PLATFORM_AUDIT_ACTION.CREATOR_LOOK_REMOVED_BY_ADMIN,
    });
  });

  it("requires authentication", async () => {
    const response = await request(testApp).delete(`/api/creator-looks/${randomUUID()}`);

    expect(response.status).toBe(401);
  });
});
