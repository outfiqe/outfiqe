import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

const seedInvite = async (email: string, invitedById: string) => {
  await prisma.adminInvite.create({
    data: {
      email,
      name: email.split("@")[0]!,
      tokenHash: hashToken(`token-${email}`),
      expiresAt: addDays(new Date(), 7),
      invitedById,
    },
  });
};

describe("GET /api/admin/invites", () => {
  it("flags the row whose email belongs to an active platform co-founder", async () => {
    const requester = await createAdminSession();
    const coFounder = await createAdminSession();

    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) throw new Error("platform organization missing in fixture");
    await prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: coFounder.userId,
          organizationId: platformOrganization.id,
        },
      },
      data: { isPlatformSuperAdmin: true },
    });

    const coFounderUser = await prisma.user.findUniqueOrThrow({
      where: { id: coFounder.userId },
      select: { email: true },
    });
    await seedInvite(coFounderUser.email, requester.userId);
    await seedInvite("outsider@outfiqe.test", requester.userId);

    const response = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    const summaries: { email: string; isCoFounder: boolean }[] = response.body.data;
    const byEmail = new Map(summaries.map((summary) => [summary.email, summary.isCoFounder]));

    expect(byEmail.get(coFounderUser.email)).toBe(true);
    expect(byEmail.get("outsider@outfiqe.test")).toBe(false);
  });

  it("returns isCoFounder: false for every row when there are no co-founders", async () => {
    const requester = await createAdminSession();
    await seedInvite("pending-one@outfiqe.test", requester.userId);
    await seedInvite("pending-two@outfiqe.test", requester.userId);

    const response = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    const summaries: { isCoFounder: boolean }[] = response.body.data;
    expect(summaries).toHaveLength(2);
    expect(summaries.every((summary) => summary.isCoFounder === false)).toBe(true);
  });
});
