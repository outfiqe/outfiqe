import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { AnnouncementStatus, UserRole } from "#generated/prisma/enums.js";
import { createAdminSession } from "#test/integration/authHelpers.js";

import { runAnnouncementScheduledDispatch } from "./announcement.lifecycle.js";
import { announcementRepository } from "./announcement.repository.js";

const createScheduledAnnouncement = async (
  createdByAdminId: string,
  scheduledAt: Date,
  audience: UserRole = UserRole.CUSTOMER,
) =>
  prisma.announcement.create({
    data: {
      title: `Scheduled announcement ${randomUUID()}`,
      body: "Body text.",
      status: "SCHEDULED",
      scheduledAt,
      createdByAdminId,
      audiences: {
        create: [{ audience: audience === UserRole.CUSTOMER ? "CUSTOMERS" : "STAFF" }],
      },
    },
  });

describe("runAnnouncementScheduledDispatch", () => {
  it("dispatches a due scheduled announcement and marks it sent", async () => {
    const admin = await createAdminSession();
    const due = await createScheduledAnnouncement(admin.userId, subDays(new Date(), 1));

    const dispatchedCount = await runAnnouncementScheduledDispatch();

    expect(dispatchedCount).toBeGreaterThanOrEqual(1);
    const updated = await prisma.announcement.findUniqueOrThrow({ where: { id: due.id } });
    expect(updated.status).toBe("SENT");
    expect(updated.recipientCount).not.toBeNull();
  });

  it("leaves a not-yet-due scheduled announcement untouched", async () => {
    const admin = await createAdminSession();
    const notYetDue = await createScheduledAnnouncement(admin.userId, addDays(new Date(), 3));

    await runAnnouncementScheduledDispatch();

    const updated = await prisma.announcement.findUniqueOrThrow({ where: { id: notYetDue.id } });
    expect(updated.status).toBe("SCHEDULED");
  });

  it("does not let a second claim attempt double-process the same row", async () => {
    const admin = await createAdminSession();
    const due = await createScheduledAnnouncement(admin.userId, subDays(new Date(), 1));

    const [firstClaim, secondClaim] = await Promise.all([
      announcementRepository.claimForSending(due.id, AnnouncementStatus.SCHEDULED),
      announcementRepository.claimForSending(due.id, AnnouncementStatus.SCHEDULED),
    ]);

    expect([firstClaim, secondClaim].filter(Boolean)).toHaveLength(1);
  });

  it("claims a draft for immediate sending but never a row that isn't a draft", async () => {
    const admin = await createAdminSession();
    const draft = await prisma.announcement.create({
      data: {
        title: `Draft announcement ${randomUUID()}`,
        body: "Body text.",
        status: "DRAFT",
        createdByAdminId: admin.userId,
        audiences: { create: [{ audience: "CUSTOMERS" }] },
      },
    });

    const claimed = await announcementRepository.claimForSending(
      draft.id,
      AnnouncementStatus.DRAFT,
    );
    expect(claimed).toBe(true);

    const claimedAgain = await announcementRepository.claimForSending(
      draft.id,
      AnnouncementStatus.DRAFT,
    );
    expect(claimedAgain).toBe(false);

    const claimedAsScheduled = await announcementRepository.claimForSending(
      draft.id,
      AnnouncementStatus.SCHEDULED,
    );
    expect(claimedAsScheduled).toBe(false);
  });
});
