import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { badgeRepository } from "#modules/badges/badge.repository.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async (name: string) =>
  prisma.user.create({
    data: {
      email: `${name}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createAdmin = async () => {
  const admin = await createUser("Test Admin");
  return { ...admin, header: authHeaderFor(admin.id, UserRole.ADMIN) };
};

const createBrand = (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Test Contact",
      email: `${randomUUID()}@outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const validBadgePayload = (overrides: Record<string, unknown> = {}) => ({
  name: `Admin-created badge ${randomUUID()}`,
  description: "A badge created via the admin API integration test.",
  category: "ENGAGEMENT",
  rarity: "COMMON",
  icon: "🧪",
  designConfig: { shape: "circle", primaryColor: "#123456" },
  xpReward: 10,
  isPermanent: true,
  isDynamic: false,
  isPublic: true,
  isTitleEligible: false,
  assignmentLimit: null,
  sponsorBrandId: null,
  requirementType: "ENGAGEMENT",
  conditions: [{ metric: "total_likes", operator: "gte", value: 5 }],
  activeFrom: null,
  activeUntil: null,
  ...overrides,
});

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const tinyPngBuffer = Buffer.from(TINY_PNG_BASE64, "base64");

const adminAwardBadgePayload = (overrides: Record<string, unknown> = {}) =>
  validBadgePayload({
    requirementType: "ADMIN_AWARD",
    conditions: undefined,
    activeFrom: undefined,
    activeUntil: undefined,
    ...overrides,
  });

const createBadge = async (overrides: {
  isTitleEligible?: boolean;
  assignmentLimit?: number | null;
  xpReward?: number;
}) =>
  prisma.badge.create({
    data: {
      name: `Test Badge ${randomUUID()}`,
      description: "A badge created for integration testing.",
      category: "SPECIAL",
      rarity: "EXCLUSIVE",
      icon: "🏅",
      designConfig: { shape: "hexagon", primaryColor: "#000000" },
      xpReward: overrides.xpReward ?? 0,
      isTitleEligible: overrides.isTitleEligible ?? false,
      assignmentLimit: overrides.assignmentLimit ?? null,
    },
  });

const grantBadge = async (userId: string, badgeId: string) =>
  prisma.userBadge.create({ data: { userId, badgeId } });

describe("badgeRepository.awardBadge", () => {
  it("awards a badge and grants no more than the assignment limit under concurrent requests", async () => {
    const badge = await createBadge({ assignmentLimit: 1, xpReward: 50 });
    const [userA, userB, userC] = await Promise.all([
      createUser("Racer A"),
      createUser("Racer B"),
      createUser("Racer C"),
    ]);

    const results = await Promise.all(
      [userA, userB, userC].map((user) =>
        badgeRepository.awardBadge({ userId: user.id, badgeId: badge.id }),
      ),
    );

    const awardedCount = results.filter((result) => result.awarded).length;
    expect(awardedCount).toBe(1);

    const storedBadge = await prisma.badge.findUniqueOrThrow({ where: { id: badge.id } });
    expect(storedBadge.assignmentCount).toBe(1);

    const userBadgeCount = await prisma.userBadge.count({ where: { badgeId: badge.id } });
    expect(userBadgeCount).toBe(1);
  });

  it("reports ALREADY_AWARDED, not ASSIGNMENT_LIMIT_REACHED, for a user who already holds a full badge", async () => {
    const badge = await createBadge({ assignmentLimit: 1 });
    const owner = await createUser("Existing Owner");
    await grantBadge(owner.id, badge.id);
    await prisma.badge.update({ where: { id: badge.id }, data: { assignmentCount: 1 } });

    const result = await badgeRepository.awardBadge({ userId: owner.id, badgeId: badge.id });

    expect(result).toEqual({ awarded: false, reason: "ALREADY_AWARDED" });
  });

  it("never touches assignmentCount for an unlimited badge", async () => {
    const badge = await createBadge({ assignmentLimit: null });
    const user = await createUser("Unlimited Recipient");

    const result = await badgeRepository.awardBadge({ userId: user.id, badgeId: badge.id });

    expect(result.awarded).toBe(true);
    const storedBadge = await prisma.badge.findUniqueOrThrow({ where: { id: badge.id } });
    expect(storedBadge.assignmentCount).toBe(0);
  });
});

describe("PATCH /api/badges/title", () => {
  it("sets a collected, title-eligible badge as the user's title", async () => {
    const user = await createUser("Title Setter");
    const badge = await createBadge({ isTitleEligible: true });
    await grantBadge(user.id, badge.id);

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: badge.id });

    expect(response.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(stored.isTitle).toBe(true);
  });

  it("rejects a collected badge that isn't title-eligible", async () => {
    const user = await createUser("Ineligible Setter");
    const badge = await createBadge({ isTitleEligible: false });
    await grantBadge(user.id, badge.id);

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: badge.id });

    expect(response.status).toBe(422);
  });

  it("rejects a title-eligible badge the user hasn't collected", async () => {
    const user = await createUser("Non Owner");
    const badge = await createBadge({ isTitleEligible: true });

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: badge.id });

    expect(response.status).toBe(422);
  });

  it("clears the title when badgeId is null", async () => {
    const user = await createUser("Title Clearer");
    const badge = await createBadge({ isTitleEligible: true });
    await grantBadge(user.id, badge.id);
    await prisma.userBadge.update({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
      data: { isTitle: true },
    });

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: null });

    expect(response.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(stored.isTitle).toBe(false);
  });

  it("clears the title when the titled badge is hidden", async () => {
    const user = await createUser("Title Hider");
    const badge = await createBadge({ isTitleEligible: true });
    await grantBadge(user.id, badge.id);
    await prisma.userBadge.update({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
      data: { isTitle: true },
    });

    const response = await request(testApp)
      .patch(`/api/badges/${badge.id}/display`)
      .set("Authorization", authHeaderFor(user.id))
      .send({ isDisplayed: false });

    expect(response.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(stored.isTitle).toBe(false);
    expect(stored.isDisplayed).toBe(false);
  });

  it("requires authentication", async () => {
    const badge = await createBadge({ isTitleEligible: true });

    const response = await request(testApp).patch("/api/badges/title").send({ badgeId: badge.id });

    expect(response.status).toBe(401);
  });
});

describe("POST /api/badges (admin)", () => {
  it("creates a rule-based badge with its achievement in one call", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload());

    expect(response.status).toBe(201);
    expect(response.body.data.achievement.requirementType).toBe("ENGAGEMENT");
    expect(response.body.data.achievement.requirementConfig.conditions).toHaveLength(1);
  });

  it("creates an admin-award badge with an assignment limit and empty conditions", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(adminAwardBadgePayload({ assignmentLimit: 5 }));

    expect(response.status).toBe(201);
    expect(response.body.data.assignmentLimit).toBe(5);
    expect(response.body.data.achievement.requirementType).toBe("ADMIN_AWARD");
    expect(response.body.data.achievement.requirementConfig.conditions).toEqual([]);
  });

  it("rejects conditions on an admin-award badge instead of silently dropping them", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        adminAwardBadgePayload({
          conditions: [{ metric: "total_likes", operator: "gte", value: 5 }],
        }),
      );

    expect(response.status).toBe(422);
  });

  it("rejects a seasonal window on an admin-award badge instead of silently dropping it", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(adminAwardBadgePayload({ activeFrom: new Date().toISOString() }));

    expect(response.status).toBe(422);
  });

  it("rejects a missing conditions array on a rule-based badge", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload({ conditions: undefined }));

    expect(response.status).toBe(422);
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createUser("Non Admin");

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", authHeaderFor(nonAdmin.id))
      .send(validBadgePayload());

    expect(response.status).toBe(403);
  });

  it("creates a badge sponsored by a real brand and returns its credit", async () => {
    const admin = await createAdmin();
    const brand = await createBrand(`Nike ${randomUUID()}`);

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload({ sponsorBrandId: brand.id }));

    expect(response.status).toBe(201);
    expect(response.body.data.sponsorBrand).toMatchObject({ id: brand.id, name: brand.name });
  });

  it("rejects a sponsor brand id that doesn't exist, without leaking a raw db error", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload({ sponsorBrandId: randomUUID() }));

    expect(response.status).toBe(422);
    expect(response.body.message).not.toMatch(/prisma|foreign key|constraint/i);
  });

  it("creates a badge with a studio-designed, multi-layer designConfig", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: {
            version: 2,
            layers: [
              {
                id: "bg",
                type: "background",
                shape: "circle",
                fill: "#1d4ed8",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
              },
              {
                id: "icon",
                type: "icon",
                glyph: "⭐",
                fontSize: 50,
                x: 25,
                y: 25,
                width: 50,
                height: 50,
              },
            ],
          },
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data.designConfig.layers).toHaveLength(2);
  });

  it("rejects a studio designConfig with more layers than the allowed maximum", async () => {
    const admin = await createAdmin();
    const tooManyLayers = Array.from({ length: 13 }, (_, index) => ({
      id: `layer-${index}`,
      type: "icon",
      glyph: "⭐",
      fontSize: 20,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    }));

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload({ designConfig: { version: 2, layers: tooManyLayers } }));

    expect(response.status).toBe(422);
  });

  it("rejects a layer with an unrecognized type", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: {
            version: 2,
            layers: [{ id: "bad", type: "video", x: 0, y: 0, width: 10, height: 10 }],
          },
        }),
      );

    expect(response.status).toBe(422);
  });

  it("rejects a designConfig that mixes legacy and studio keys", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: { shape: "circle", primaryColor: "#123456", version: 2, layers: [] },
        }),
      );

    expect(response.status).toBe(422);
  });
});

describe("PATCH /api/badges/:badgeId (admin)", () => {
  it("updates the badge and its achievement together", async () => {
    const admin = await createAdmin();
    const created = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload());
    const badgeId = created.body.data.id;

    const response = await request(testApp)
      .patch(`/api/badges/${badgeId}`)
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          name: "Updated name",
          requirementType: "COMMUNITY",
          conditions: [{ metric: "comments_made", operator: "gte", value: 20 }],
          isActive: false,
          achievementIsActive: true,
        }),
      );

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Updated name");
    expect(response.body.data.isActive).toBe(false);
    expect(response.body.data.achievement.requirementType).toBe("COMMUNITY");
    expect(response.body.data.achievement.requirementConfig.conditions[0]).toMatchObject({
      metric: "comments_made",
      value: 20,
    });
  });

  it("adds and then clears a sponsor brand on an existing badge", async () => {
    const admin = await createAdmin();
    const brand = await createBrand(`Adidas ${randomUUID()}`);
    const created = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload());
    const badgeId = created.body.data.id;

    const sponsored = await request(testApp)
      .patch(`/api/badges/${badgeId}`)
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({ sponsorBrandId: brand.id, isActive: true, achievementIsActive: true }),
      );

    expect(sponsored.status).toBe(200);
    expect(sponsored.body.data.sponsorBrand).toMatchObject({ id: brand.id, name: brand.name });

    const cleared = await request(testApp)
      .patch(`/api/badges/${badgeId}`)
      .set("Authorization", admin.header)
      .send(validBadgePayload({ isActive: true, achievementIsActive: true }));

    expect(cleared.status).toBe(200);
    expect(cleared.body.data.sponsorBrand).toBeNull();
  });

  it("pauses achievement evaluation without deactivating the badge", async () => {
    const admin = await createAdmin();
    const created = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload());
    const badgeId = created.body.data.id;

    const response = await request(testApp)
      .patch(`/api/badges/${badgeId}`)
      .set("Authorization", admin.header)
      .send(validBadgePayload({ isActive: true, achievementIsActive: false }));

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(true);
    expect(response.body.data.achievement.isActive).toBe(false);
  });

  it("stores a seasonal window and rejects an inverted one", async () => {
    const admin = await createAdmin();
    const created = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload());
    const badgeId = created.body.data.id;

    const activeFrom = new Date(Date.now() - 60_000).toISOString();
    const activeUntil = new Date(Date.now() + 60_000).toISOString();

    const valid = await request(testApp)
      .patch(`/api/badges/${badgeId}`)
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          isActive: true,
          achievementIsActive: true,
          activeFrom,
          activeUntil,
        }),
      );

    expect(valid.status).toBe(200);
    expect(valid.body.data.achievement.activeFrom).toBe(activeFrom);
    expect(valid.body.data.achievement.activeUntil).toBe(activeUntil);

    const inverted = await request(testApp)
      .patch(`/api/badges/${badgeId}`)
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          isActive: true,
          achievementIsActive: true,
          activeFrom: activeUntil,
          activeUntil: activeFrom,
        }),
      );

    expect(inverted.status).toBe(422);
  });

  it("404s for a badge that doesn't exist", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .patch(`/api/badges/${randomUUID()}`)
      .set("Authorization", admin.header)
      .send(validBadgePayload({ isActive: true, achievementIsActive: true }));

    expect(response.status).toBe(404);
  });
});

describe("POST /api/badges/:badgeId/award (admin)", () => {
  it("awards a badge with a reason and rejects a duplicate award", async () => {
    const admin = await createAdmin();
    const badge = await createBadge({});
    const recipient = await createUser("Award Recipient");

    const first = await request(testApp)
      .post(`/api/badges/${badge.id}/award`)
      .set("Authorization", admin.header)
      .send({ userId: recipient.id, reason: "Integration test award" });

    expect(first.status).toBe(201);
    expect(first.body.data.awarded).toBe(true);

    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: recipient.id, badgeId: badge.id } },
    });
    expect(stored.awardedById).toBe(admin.id);
    expect(stored.awardReason).toBe("Integration test award");

    const second = await request(testApp)
      .post(`/api/badges/${badge.id}/award`)
      .set("Authorization", admin.header)
      .send({ userId: recipient.id, reason: "Duplicate" });

    expect(second.status).toBe(422);
  });

  it("requires a reason", async () => {
    const admin = await createAdmin();
    const badge = await createBadge({});
    const recipient = await createUser("No Reason Recipient");

    const response = await request(testApp)
      .post(`/api/badges/${badge.id}/award`)
      .set("Authorization", admin.header)
      .send({ userId: recipient.id, reason: "" });

    expect(response.status).toBe(422);
  });
});

describe("POST /api/badges/user-badges/:userBadgeId/remove (admin)", () => {
  it("removes a manually awarded badge and rejects removing it again", async () => {
    const admin = await createAdmin();
    const badge = await createBadge({});
    const recipient = await createUser("Removal Recipient");
    const userBadge = await prisma.userBadge.create({
      data: { userId: recipient.id, badgeId: badge.id, awardedById: admin.id },
    });

    const first = await request(testApp)
      .post(`/api/badges/user-badges/${userBadge.id}/remove`)
      .set("Authorization", admin.header)
      .send({ reason: "Integration test removal" });

    expect(first.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({ where: { id: userBadge.id } });
    expect(stored.removedAt).not.toBeNull();
    expect(stored.removedReason).toBe("Integration test removal");

    const second = await request(testApp)
      .post(`/api/badges/user-badges/${userBadge.id}/remove`)
      .set("Authorization", admin.header)
      .send({ reason: "Again" });

    expect(second.status).toBe(404);
  });
});

describe("GET /api/badges/admin/:badgeId (admin)", () => {
  it("returns a single badge with its achievement", async () => {
    const admin = await createAdmin();
    const created = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(validBadgePayload());
    const badgeId = created.body.data.id;

    const response = await request(testApp)
      .get(`/api/badges/admin/${badgeId}`)
      .set("Authorization", admin.header);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(badgeId);
    expect(response.body.data.achievement.requirementType).toBe("ENGAGEMENT");
  });

  it("404s for a badge that doesn't exist", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .get(`/api/badges/admin/${randomUUID()}`)
      .set("Authorization", admin.header);

    expect(response.status).toBe(404);
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createUser("Non Admin Reader");

    const response = await request(testApp)
      .get(`/api/badges/admin/${randomUUID()}`)
      .set("Authorization", authHeaderFor(nonAdmin.id));

    expect(response.status).toBe(403);
  });
});

describe("POST /api/badges/admin/icon-image (admin)", () => {
  it("normalizes an uploaded image and returns a managed uploads URL", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges/admin/icon-image")
      .set("Authorization", admin.header)
      .attach("file", tinyPngBuffer, { filename: "icon.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toMatch(/\/uploads\/[^/]+\.png$/);
  });

  it("rejects a non-image mime type", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges/admin/icon-image")
      .set("Authorization", admin.header)
      .attach("file", Buffer.from("<svg/>"), {
        filename: "icon.svg",
        contentType: "image/svg+xml",
      });

    expect(response.status).toBe(422);
  });

  it("rejects a file larger than the size limit", async () => {
    const admin = await createAdmin();
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 1);

    const response = await request(testApp)
      .post("/api/badges/admin/icon-image")
      .set("Authorization", admin.header)
      .attach("file", oversized, { filename: "icon.png", contentType: "image/png" });

    expect(response.status).toBe(422);
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createUser("Non Admin Uploader");

    const response = await request(testApp)
      .post("/api/badges/admin/icon-image")
      .set("Authorization", authHeaderFor(nonAdmin.id))
      .attach("file", tinyPngBuffer, { filename: "icon.png", contentType: "image/png" });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/badges (admin) — icon image designConfig", () => {
  it("accepts a simple designConfig whose imageUrl points at the managed uploads host", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: {
            shape: "circle",
            primaryColor: "#123456",
            imageUrl: `${process.env.API_PUBLIC_URL ?? "http://localhost:4000"}/uploads/badge-icon.png`,
          },
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data.designConfig.imageUrl).toMatch(/\/uploads\/badge-icon\.png$/);
  });

  it("rejects a designConfig imageUrl pointing at an external host", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: {
            shape: "circle",
            primaryColor: "#123456",
            imageUrl: "https://evil.example.com/uploads/badge-icon.png",
          },
        }),
      );

    expect(response.status).toBe(422);
  });

  it("accepts a studio image layer with a managed url and rejects an external one", async () => {
    const admin = await createAdmin();
    const managedUrl = `${process.env.API_PUBLIC_URL ?? "http://localhost:4000"}/uploads/layer.png`;
    const imageLayer = (url: string) => ({
      id: "img",
      type: "image",
      url,
      fit: "contain",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });

    const accepted = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: { version: 2, layers: [imageLayer(managedUrl)] },
        }),
      );
    expect(accepted.status).toBe(201);

    const rejected = await request(testApp)
      .post("/api/badges")
      .set("Authorization", admin.header)
      .send(
        validBadgePayload({
          designConfig: {
            version: 2,
            layers: [imageLayer("https://evil.example.com/layer.png")],
          },
        }),
      );
    expect(rejected.status).toBe(422);
  });
});
