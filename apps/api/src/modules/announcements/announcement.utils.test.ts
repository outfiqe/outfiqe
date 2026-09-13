import { describe, expect, it } from "vitest";

import {
  AnnouncementAudience,
  AnnouncementStatus,
  CreatorStatus,
  NotificationSurface,
  UserRole,
} from "#generated/prisma/enums.js";

import {
  buildAnnouncementMetadata,
  resolveAudienceWhere,
  toAnnouncementRecord,
  toAnnouncementView,
} from "./announcement.utils.js";

const ADMIN_ID = "admin-1";

const announcementRow = {
  id: "announcement-1",
  title: "Livestream tomorrow",
  body: "Join us at 6pm for a live drop.",
  audiences: [
    { id: "target-1", announcementId: "announcement-1", audience: AnnouncementAudience.CUSTOMERS },
  ],
  targetSurface: NotificationSurface.WEB,
  targetPath: "/events/spring-drop",
  expiresAt: new Date("2026-10-01T00:00:00.000Z"),
  scheduledAt: null,
  sentAt: null,
  status: AnnouncementStatus.DRAFT,
  recipientCount: null,
  createdByAdminId: ADMIN_ID,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

describe("resolveAudienceWhere", () => {
  it("resolves EVERYONE to no segment filter beyond excluding the sender", () => {
    const where = resolveAudienceWhere([AnnouncementAudience.EVERYONE], ADMIN_ID);
    expect(where).toEqual({ id: { not: ADMIN_ID } });
  });

  it("resolves CUSTOMERS to a role filter", () => {
    const where = resolveAudienceWhere([AnnouncementAudience.CUSTOMERS], ADMIN_ID);
    expect(where).toEqual({
      OR: [{ role: UserRole.CUSTOMER }],
      id: { not: ADMIN_ID },
    });
  });

  it("resolves APPROVED_CREATORS to the isCreator + creatorStatus predicate", () => {
    const where = resolveAudienceWhere([AnnouncementAudience.APPROVED_CREATORS], ADMIN_ID);
    expect(where).toEqual({
      OR: [{ isCreator: true, creatorStatus: CreatorStatus.APPROVED }],
      id: { not: ADMIN_ID },
    });
  });

  it("resolves BRAND_OWNERS and STAFF to their role filters", () => {
    expect(resolveAudienceWhere([AnnouncementAudience.BRAND_OWNERS], ADMIN_ID)).toEqual({
      OR: [{ role: UserRole.BRAND_OWNER }],
      id: { not: ADMIN_ID },
    });
    expect(resolveAudienceWhere([AnnouncementAudience.STAFF], ADMIN_ID)).toEqual({
      OR: [{ role: UserRole.ADMIN }],
      id: { not: ADMIN_ID },
    });
  });

  it("ORs multiple selected segments together", () => {
    const where = resolveAudienceWhere(
      [AnnouncementAudience.CUSTOMERS, AnnouncementAudience.BRAND_OWNERS],
      ADMIN_ID,
    );
    expect(where).toEqual({
      OR: [{ role: UserRole.CUSTOMER }, { role: UserRole.BRAND_OWNER }],
      id: { not: ADMIN_ID },
    });
  });

  it("short-circuits to no segment filter when EVERYONE is selected alongside others", () => {
    const where = resolveAudienceWhere(
      [AnnouncementAudience.EVERYONE, AnnouncementAudience.STAFF],
      ADMIN_ID,
    );
    expect(where).toEqual({ id: { not: ADMIN_ID } });
  });

  it("always excludes the sending admin, regardless of the selected segments", () => {
    const where = resolveAudienceWhere([AnnouncementAudience.STAFF], "some-other-admin");
    expect(where).toMatchObject({ id: { not: "some-other-admin" } });
  });
});

describe("toAnnouncementRecord", () => {
  it("flattens the audience child rows down to their bare enum values", () => {
    const record = toAnnouncementRecord(announcementRow);
    expect(record.audiences).toEqual([AnnouncementAudience.CUSTOMERS]);
    expect(record.id).toBe("announcement-1");
    expect(record.targetPath).toBe("/events/spring-drop");
  });

  it("returns an empty audiences array when the announcement has no target rows", () => {
    const record = toAnnouncementRecord({ ...announcementRow, audiences: [] });
    expect(record.audiences).toEqual([]);
  });
});

describe("toAnnouncementView", () => {
  it("stringifies every date field to ISO and attaches the resolved audience count", () => {
    const record = toAnnouncementRecord(announcementRow);
    const view = toAnnouncementView(record, 42);

    expect(view.expiresAt).toBe("2026-10-01T00:00:00.000Z");
    expect(view.scheduledAt).toBeNull();
    expect(view.sentAt).toBeNull();
    expect(view.createdAt).toBe("2026-09-01T00:00:00.000Z");
    expect(view.resolvedAudienceCount).toBe(42);
  });

  it("leaves expiresAt null when the announcement has no expiry", () => {
    const record = toAnnouncementRecord({ ...announcementRow, expiresAt: null });
    const view = toAnnouncementView(record, 0);
    expect(view.expiresAt).toBeNull();
  });

  it("stringifies scheduledAt and sentAt when they're set", () => {
    const record = toAnnouncementRecord({
      ...announcementRow,
      scheduledAt: new Date("2026-09-05T18:00:00.000Z"),
      sentAt: new Date("2026-09-05T18:01:00.000Z"),
    });
    const view = toAnnouncementView(record, 10);

    expect(view.scheduledAt).toBe("2026-09-05T18:00:00.000Z");
    expect(view.sentAt).toBe("2026-09-05T18:01:00.000Z");
  });
});

describe("buildAnnouncementMetadata", () => {
  it("builds the notification metadata snapshot fanned out to every recipient", () => {
    const record = toAnnouncementRecord(announcementRow);
    expect(buildAnnouncementMetadata(record)).toEqual({
      announcementTitle: "Livestream tomorrow",
      announcementBody: "Join us at 6pm for a live drop.",
      announcementTargetSurface: NotificationSurface.WEB,
      announcementTargetPath: "/events/spring-drop",
      announcementExpiresAt: "2026-10-01T00:00:00.000Z",
    });
  });

  it("carries a null announcementExpiresAt for an announcement with no expiry", () => {
    const record = toAnnouncementRecord({ ...announcementRow, expiresAt: null });
    expect(buildAnnouncementMetadata(record).announcementExpiresAt).toBeNull();
  });
});
