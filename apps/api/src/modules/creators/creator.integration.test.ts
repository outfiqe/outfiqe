import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createApprovedCreator = async (
  name: string,
  handle: string,
  overrides: { heightCm?: number; showHeight?: boolean } = {},
) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      ...overrides,
    },
  });

const createPlainUser = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

const createPendingCreator = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      creatorStatus: CreatorStatus.PENDING,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const adminAuthHeaderFor = (userId: string) => authHeaderFor(userId, UserRole.ADMIN);

describe("GET /api/creators/autocomplete", () => {
  it("returns approved creators ranked by name/handle match", async () => {
    await createApprovedCreator("Ava Martinez", "ava-martinez");
    await createApprovedCreator("Noah Chen", "noah-chen");

    const response = await request(testApp)
      .get("/api/creators/autocomplete")
      .query({ q: "Ava Martinez" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({ name: "Ava Martinez" });
    expect(response.body.data[0]).toHaveProperty("userId");
    expect(response.body.data[0]).toHaveProperty("handle");
    expect(response.body.data[0]).toHaveProperty("followerCount");
  });

  it("excludes users who aren't approved creators", async () => {
    await prisma.user.create({
      data: {
        email: `pending-${randomUUID()}@outfiqe.test`,
        name: "Pending Creator",
        handle: `pending-creator-${randomUUID().slice(0, 6)}`,
        phone: uniquePhone(),
        passwordHash: "not-used-in-tests",
        isCreator: false,
        creatorStatus: CreatorStatus.PENDING,
      },
    });

    const response = await request(testApp)
      .get("/api/creators/autocomplete")
      .query({ q: "Pending Creator" });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("returns an empty list for no match instead of erroring", async () => {
    const response = await request(testApp)
      .get("/api/creators/autocomplete")
      .query({ q: "zzznonexistentcreatorzzz" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("rejects an empty query", async () => {
    const response = await request(testApp).get("/api/creators/autocomplete").query({ q: "" });

    expect(response.status).toBe(422);
  });
});

describe("PATCH /api/creators/me", () => {
  it("updates the creator's height and show-height preference", async () => {
    const creator = await createApprovedCreator("Height Setter", "height-setter");

    const response = await request(testApp)
      .patch("/api/creators/me")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ heightCm: 178, showHeight: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ heightCm: 178, showHeight: true });

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: creator.id } });
    expect(stored.heightCm).toBe(178);
    expect(stored.showHeight).toBe(true);
  });

  it("rejects a height outside the allowed range", async () => {
    const creator = await createApprovedCreator("Height Rejector", "height-rejector");

    const response = await request(testApp)
      .patch("/api/creators/me")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ heightCm: 400 });

    expect(response.status).toBe(422);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .patch("/api/creators/me")
      .send({ heightCm: 178, showHeight: true });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creators/by-handle/:handle", () => {
  it("hides height from other viewers when the creator has not opted in", async () => {
    const creator = await createApprovedCreator("Hidden Height", "hidden-height", {
      heightCm: 165,
      showHeight: false,
    });
    const viewer = await createApprovedCreator("Some Viewer", "some-viewer");

    const response = await request(testApp)
      .get(`/api/creators/by-handle/${creator.handle}`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.heightCm).toBeNull();
    expect(response.body.data.showHeight).toBe(false);
  });

  it("shows height to other viewers when the creator has opted in", async () => {
    const creator = await createApprovedCreator("Shown Height", "shown-height", {
      heightCm: 172,
      showHeight: true,
    });

    const response = await request(testApp).get(`/api/creators/by-handle/${creator.handle}`);

    expect(response.status).toBe(200);
    expect(response.body.data.heightCm).toBe(172);
  });

  it("always reveals the real height to the profile owner, even when hidden from others", async () => {
    const creator = await createApprovedCreator("Owner View", "owner-view", {
      heightCm: 190,
      showHeight: false,
    });

    const response = await request(testApp)
      .get(`/api/creators/by-handle/${creator.handle}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.heightCm).toBe(190);
  });

  it("returns 404 for a handle that doesn't exist", async () => {
    const response = await request(testApp).get(
      `/api/creators/by-handle/no-such-handle-${randomUUID()}`,
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for a user who exists but isn't a creator", async () => {
    const user = await createPlainUser("Not A Creator", "not-a-creator");

    const response = await request(testApp).get(`/api/creators/by-handle/${user.handle}`);

    expect(response.status).toBe(404);
  });
});

describe("GET /api/creators/by-handle/:handle/looks", () => {
  it("returns the creator's published looks", async () => {
    const creator = await createApprovedCreator("Look Poster", "look-poster");
    await prisma.creatorLook.create({
      data: {
        creatorId: creator.id,
        imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
        caption: "A look",
      },
    });

    const response = await request(testApp).get(`/api/creators/by-handle/${creator.handle}/looks`);

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toHaveLength(1);
  });

  it("returns 404 for a handle that doesn't exist", async () => {
    const response = await request(testApp).get(
      `/api/creators/by-handle/no-such-handle-${randomUUID()}/looks`,
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/creators/apply", () => {
  it("moves a plain user into PENDING", async () => {
    const user = await createPlainUser("Applying User", "applying-user");

    const response = await request(testApp)
      .post("/api/creators/apply")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(200);
    expect(response.body.data.creatorStatus).toBe(CreatorStatus.PENDING);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.creatorStatus).toBe(CreatorStatus.PENDING);
  });

  it("rejects applying again once already PENDING", async () => {
    const user = await createPendingCreator("Already Pending", "already-pending");

    const response = await request(testApp)
      .post("/api/creators/apply")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(409);
  });

  it("rejects applying again once already APPROVED", async () => {
    const creator = await createApprovedCreator("Already Approved", "already-approved");

    const response = await request(testApp)
      .post("/api/creators/apply")
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(409);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).post("/api/creators/apply");

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creators/me", () => {
  it("returns the caller's own profile", async () => {
    const creator = await createApprovedCreator("Self Viewer", "self-viewer");

    const response = await request(testApp)
      .get("/api/creators/me")
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ userId: creator.id, name: "Self Viewer" });
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/creators/me");

    expect(response.status).toBe(401);
  });

  it("returns 404 when the token's user no longer exists", async () => {
    const response = await request(testApp)
      .get("/api/creators/me")
      .set("Authorization", authHeaderFor(randomUUID()));

    expect(response.status).toBe(404);
  });
});

describe("GET /api/creators/search", () => {
  it("returns matches with a total count", async () => {
    await createApprovedCreator("Search Target One", "search-target-one");

    const response = await request(testApp)
      .get("/api/creators/search")
      .query({ q: "Search Target One" });

    expect(response.status).toBe(200);
    expect(response.body.data.creators.length).toBeGreaterThan(0);
    expect(response.body.data).toHaveProperty("total");
    expect(response.body.data).toHaveProperty("nextCursor");
  });

  it("paginates using nextCursor", async () => {
    const tag = randomUUID().slice(0, 8);
    await createApprovedCreator(`Pager ${tag} A`, `pager-${tag}-a`);
    await createApprovedCreator(`Pager ${tag} B`, `pager-${tag}-b`);

    const first = await request(testApp)
      .get("/api/creators/search")
      .query({ q: `Pager ${tag}`, limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.creators).toHaveLength(1);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/creators/search")
      .query({ q: `Pager ${tag}`, limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.creators).toHaveLength(1);
    expect(second.body.data.creators[0].userId).not.toBe(first.body.data.creators[0].userId);
  });

  it("returns an empty page for no match", async () => {
    const response = await request(testApp)
      .get("/api/creators/search")
      .query({ q: "zzznonexistentsearchzzz" });

    expect(response.status).toBe(200);
    expect(response.body.data.creators).toEqual([]);
    expect(response.body.data.nextCursor).toBeNull();
  });
});

describe("GET /api/creators (admin list)", () => {
  it("lists creators filtered by status for an admin", async () => {
    const admin = await createPlainUser("List Admin", "list-admin");
    const pending = await createPendingCreator("Listed Pending", "listed-pending");

    const response = await request(testApp)
      .get("/api/creators")
      .query({ status: CreatorStatus.PENDING })
      .set("Authorization", adminAuthHeaderFor(admin.id));

    expect(response.status).toBe(200);
    expect(
      response.body.data.creators.some((entry: { userId: string }) => entry.userId === pending.id),
    ).toBe(true);
  });

  it("rejects a non-admin caller", async () => {
    const creator = await createApprovedCreator("Not Admin", "not-admin");

    const response = await request(testApp)
      .get("/api/creators")
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(403);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/creators");

    expect(response.status).toBe(401);
  });
});

describe("POST /api/creators/:userId/approve", () => {
  it("approves a pending creator", async () => {
    const admin = await createPlainUser("Approving Admin", "approving-admin");
    const pending = await createPendingCreator("To Be Approved", "to-be-approved");

    const response = await request(testApp)
      .post(`/api/creators/${pending.id}/approve`)
      .set("Authorization", adminAuthHeaderFor(admin.id));

    expect(response.status).toBe(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(stored.creatorStatus).toBe(CreatorStatus.APPROVED);
    expect(stored.isCreator).toBe(true);
  });

  it("rejects approving a creator who isn't pending", async () => {
    const admin = await createPlainUser("Approving Admin Two", "approving-admin-two");
    const creator = await createApprovedCreator("Already Done", "already-done");

    const response = await request(testApp)
      .post(`/api/creators/${creator.id}/approve`)
      .set("Authorization", adminAuthHeaderFor(admin.id));

    expect(response.status).toBe(409);
  });

  it("returns 404 for a user that doesn't exist", async () => {
    const admin = await createPlainUser("Approving Admin Three", "approving-admin-three");

    const response = await request(testApp)
      .post(`/api/creators/${randomUUID()}/approve`)
      .set("Authorization", adminAuthHeaderFor(admin.id));

    expect(response.status).toBe(404);
  });

  it("rejects a non-admin caller", async () => {
    const pending = await createPendingCreator("Blocked Approval", "blocked-approval");

    const response = await request(testApp)
      .post(`/api/creators/${pending.id}/approve`)
      .set("Authorization", authHeaderFor(pending.id));

    expect(response.status).toBe(403);
  });
});

describe("POST /api/creators/:userId/reject", () => {
  it("rejects a pending creator", async () => {
    const admin = await createPlainUser("Rejecting Admin", "rejecting-admin");
    const pending = await createPendingCreator("To Be Rejected", "to-be-rejected");

    const response = await request(testApp)
      .post(`/api/creators/${pending.id}/reject`)
      .set("Authorization", adminAuthHeaderFor(admin.id));

    expect(response.status).toBe(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(stored.creatorStatus).toBe(CreatorStatus.REJECTED);
    expect(stored.isCreator).toBe(false);
  });

  it("rejects rejecting a creator who isn't pending", async () => {
    const admin = await createPlainUser("Rejecting Admin Two", "rejecting-admin-two");
    const creator = await createApprovedCreator("Not Pending", "not-pending-reject");

    const response = await request(testApp)
      .post(`/api/creators/${creator.id}/reject`)
      .set("Authorization", adminAuthHeaderFor(admin.id));

    expect(response.status).toBe(409);
  });

  it("rejects a non-admin caller", async () => {
    const pending = await createPendingCreator("Blocked Rejection", "blocked-rejection");

    const response = await request(testApp)
      .post(`/api/creators/${pending.id}/reject`)
      .set("Authorization", authHeaderFor(pending.id));

    expect(response.status).toBe(403);
  });
});
