import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import {
  createAdminSession,
  createAdminSessionWithPlatformPermissions,
} from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import {
  ANNOUNCEMENT_AUDIT_ACTION,
  ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS,
} from "./announcement.constants.js";

const ANNOUNCEMENTS_MANAGE_PERMISSION_KEY = "platform:announcements:manage";

const createUser = async (role: UserRole = UserRole.CUSTOMER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `announcement-audience-${suffix}@outfiqe.test`,
      name: "Announcement Audience Tester",
      handle: `announcement-audience-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const draftBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Livestream tomorrow",
  body: "Join us at 6pm for a live drop with our top creators.",
  audiences: ["CUSTOMERS"],
  ...overrides,
});

const createDraft = async (authHeader: string, overrides: Record<string, unknown> = {}) => {
  const response = await request(testApp)
    .post("/api/admin/announcements")
    .set("Authorization", authHeader)
    .send(draftBody(overrides))
    .expect(201);
  return response.body.data as { id: string; resolvedAudienceCount: number };
};

describe("POST /api/admin/announcements", () => {
  it("blocks a platform staffer without platform:announcements:manage", async () => {
    const staffer = await createAdminSession();

    const response = await request(testApp)
      .post("/api/admin/announcements")
      .set("Authorization", staffer.authHeader)
      .send(draftBody());

    expect(response.status).toBe(403);
    const count = await prisma.announcement.count();
    expect(count).toBe(0);
  });

  it("drafts an announcement and reports a live resolved audience count", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    await createUser(UserRole.CUSTOMER);
    await createUser(UserRole.CUSTOMER);
    await createUser(UserRole.BRAND_OWNER);

    const announcement = await createDraft(admin.authHeader, { audiences: ["CUSTOMERS"] });

    expect(announcement.resolvedAudienceCount).toBeGreaterThanOrEqual(2);

    const stored = await prisma.announcement.findUniqueOrThrow({
      where: { id: announcement.id },
      include: { audiences: true },
    });
    expect(stored.status).toBe("DRAFT");
    expect(stored.createdByAdminId).toBe(admin.userId);
    expect(stored.audiences.map((row) => row.audience)).toEqual(["CUSTOMERS"]);
  });
});

describe("PATCH /api/admin/announcements/:id", () => {
  it("updates a draft's fields", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader);

    const response = await request(testApp)
      .patch(`/api/admin/announcements/${draft.id}`)
      .set("Authorization", admin.authHeader)
      .send(draftBody({ title: "Updated title", audiences: ["STAFF"] }))
      .expect(200);

    expect(response.body.data.title).toBe("Updated title");
    expect(response.body.data.audiences).toEqual(["STAFF"]);
  });

  it("refuses to edit an announcement that is no longer a draft", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader, { audiences: ["STAFF"] });
    await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({})
      .expect(200);

    const response = await request(testApp)
      .patch(`/api/admin/announcements/${draft.id}`)
      .set("Authorization", admin.authHeader)
      .send(draftBody());

    expect(response.status).toBe(409);
  });
});

describe("GET /api/admin/announcements", () => {
  it("filters the list by status", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader, { title: "Still a draft" });
    const sent = await createDraft(admin.authHeader, {
      title: "Already sent",
      audiences: ["STAFF"],
    });
    await request(testApp)
      .post(`/api/admin/announcements/${sent.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({})
      .expect(200);

    const draftsResponse = await request(testApp)
      .get("/api/admin/announcements?status=DRAFT")
      .set("Authorization", admin.authHeader)
      .expect(200);
    const draftIds = draftsResponse.body.data.announcements.map((row: { id: string }) => row.id);
    expect(draftIds).toContain(draft.id);
    expect(draftIds).not.toContain(sent.id);

    const sentResponse = await request(testApp)
      .get("/api/admin/announcements?status=SENT")
      .set("Authorization", admin.authHeader)
      .expect(200);
    const sentIds = sentResponse.body.data.announcements.map((row: { id: string }) => row.id);
    expect(sentIds).toContain(sent.id);
  });
});

describe("POST /api/admin/announcements/:id/send", () => {
  it("sends immediately to a small audience, writes notifications, and records the audit trail", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const recipient = await createUser(UserRole.BRAND_OWNER);
    const draft = await createDraft(admin.authHeader, {
      audiences: ["BRAND_OWNERS"],
      targetSurface: "WEB",
      targetPath: "/events/spring-drop",
    });

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({})
      .expect(200);

    expect(response.body.data.status).toBe("SENT");
    expect(response.body.data.recipientCount).toBeGreaterThanOrEqual(1);

    const notification = await prisma.notification.findFirst({
      where: { recipientId: recipient.id, type: "ANNOUNCEMENT", entityId: draft.id },
    });
    expect(notification).not.toBeNull();
    expect(notification?.targetPath).toBe("/events/spring-drop");
    const metadata = notification?.metadata as { announcementTitle?: string } | null;
    expect(metadata?.announcementTitle).toBe("Livestream tomorrow");

    const auditEntry = await prisma.platformAuditLog.findFirst({
      where: { targetId: draft.id, action: ANNOUNCEMENT_AUDIT_ACTION.SENT },
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.actorUserId).toBe(admin.userId);
  });

  it("never notifies the sending admin, even when they're in the resolved segment", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader, { audiences: ["STAFF"] });

    await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({})
      .expect(200);

    const selfNotification = await prisma.notification.findFirst({
      where: { recipientId: admin.userId, type: "ANNOUNCEMENT", entityId: draft.id },
    });
    expect(selfNotification).toBeNull();
  });

  it("completes with recipientCount 0 and an audit entry when nothing matches", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader, { audiences: ["STAFF"] });

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({})
      .expect(200);

    expect(response.body.data.status).toBe("SENT");
    expect(response.body.data.recipientCount).toBe(0);

    const auditEntry = await prisma.platformAuditLog.findFirst({
      where: { targetId: draft.id, action: ANNOUNCEMENT_AUDIT_ACTION.SENT },
    });
    expect((auditEntry?.metadata as { recipientCount?: number } | null)?.recipientCount).toBe(0);
  });

  it("rejects a scheduledAt in the past", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader);

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({ scheduledAt: subDays(new Date(), 1).toISOString() });

    expect(response.status).toBe(422);
  });

  it("rejects sending when expiresAt would fall at or before the send time", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const soonToExpire = addDays(new Date(), 1);
    const draft = await createDraft(admin.authHeader, {
      expiresAt: soonToExpire.toISOString(),
    });

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({ scheduledAt: addDays(new Date(), 2).toISOString() });

    expect(response.status).toBe(422);
  });

  it("schedules for later and records the scheduled audit entry", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader);
    const scheduledAt = addDays(new Date(), 3);

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({ scheduledAt: scheduledAt.toISOString() })
      .expect(200);

    expect(response.body.data.status).toBe("SCHEDULED");

    const auditEntry = await prisma.platformAuditLog.findFirst({
      where: { targetId: draft.id, action: ANNOUNCEMENT_AUDIT_ACTION.SCHEDULED },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("refuses an immediate send once the resolved audience reaches the send-now cap", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );

    await prisma.user.createMany({
      data: Array.from({ length: ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS }, (_, index) => {
        const suffix = `${randomUUID().slice(0, 6)}-${index}`;
        return {
          email: `announcement-cap-${suffix}@outfiqe.test`,
          name: "Cap Tester",
          handle: `announcement-cap-${suffix}`,
          phone: uniquePhone(),
          passwordHash: "not-used-in-tests",
          role: UserRole.CUSTOMER,
        };
      }),
    });

    const draft = await createDraft(admin.authHeader, { audiences: ["CUSTOMERS"] });
    expect(draft.resolvedAudienceCount).toBeGreaterThanOrEqual(
      ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS,
    );

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({});

    expect(response.status).toBe(422);

    const scheduled = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({ scheduledAt: addDays(new Date(), 1).toISOString() })
      .expect(200);
    expect(scheduled.body.data.status).toBe("SCHEDULED");
  });
});

describe("POST /api/admin/announcements/:id/cancel", () => {
  it("cancels a draft", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader);

    await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/cancel`)
      .set("Authorization", admin.authHeader)
      .send()
      .expect(200);

    const stored = await prisma.announcement.findUniqueOrThrow({ where: { id: draft.id } });
    expect(stored.status).toBe("CANCELED");

    const auditEntry = await prisma.platformAuditLog.findFirst({
      where: { targetId: draft.id, action: ANNOUNCEMENT_AUDIT_ACTION.CANCELED },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("refuses to cancel an announcement that has already been sent", async () => {
    const admin = await createAdminSessionWithPlatformPermissions(
      ANNOUNCEMENTS_MANAGE_PERMISSION_KEY,
    );
    const draft = await createDraft(admin.authHeader, { audiences: ["STAFF"] });
    await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/send`)
      .set("Authorization", admin.authHeader)
      .send({})
      .expect(200);

    const response = await request(testApp)
      .post(`/api/admin/announcements/${draft.id}/cancel`)
      .set("Authorization", admin.authHeader)
      .send();

    expect(response.status).toBe(409);
  });
});
