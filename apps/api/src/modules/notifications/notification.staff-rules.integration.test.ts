import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { NotificationEntityType, NotificationType, UserRole } from "#generated/prisma/enums.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { createRoleLimitedStaffSession } from "#test/integration/authHelpers.js";
import {
  ensurePlatformOrganizationExists,
  seedTenantOrganization,
} from "#test/integration/crmFixtures.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { notificationService } from "./notification.service.js";

const createTenantStaff = async (organizationId: string, roleId: string) => {
  const suffix = randomUUID().slice(0, 8);
  const staffMember = await prisma.user.create({
    data: {
      email: `tenant-rules-${suffix}@outfiqe.test`,
      name: `Tenant Staff ${suffix}`,
      handle: `tenant-rules-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.TENANT_STAFF,
    },
  });
  const membership = await prisma.membership.create({
    data: { organizationId, userId: staffMember.id, roleId },
  });
  return { userId: staffMember.id, membershipId: membership.id };
};

const createTenantRole = (organizationId: string, permissionKeys: string[]) =>
  crmAccessRepository.createRole({
    organizationId,
    name: `Role ${randomUUID().slice(0, 8)}`,
    permissionKeys,
  });

const notificationsFor = (recipientId: string) =>
  prisma.notification.findMany({ where: { recipientId } });

const seedTenantWithBillingTeam = async () => {
  const { organization, memberRole } = await seedTenantOrganization();
  const billingRole = await createTenantRole(organization.id, ["billing:manage"]);
  const billingManager = await createTenantStaff(organization.id, billingRole.id);
  const salesMember = await createTenantStaff(organization.id, memberRole.id);
  const owner = await createTenantStaff(organization.id, memberRole.id);
  await prisma.organization.update({
    where: { id: organization.id },
    data: { superAdminMembershipId: owner.membershipId },
  });
  return { organization, billingManager, salesMember, owner };
};

describe("notificationService.notifyPlatformStaff", () => {
  it("notifies only staff whose role holds the matching permission", async () => {
    const brandReviewer = await createRoleLimitedStaffSession("platform:brands:manage");
    const supportAgent = await createRoleLimitedStaffSession("platform:support:respond");
    const platformOrganization = await ensurePlatformOrganizationExists();

    await notificationService.notifyPlatformStaff({
      type: NotificationType.BRAND_APPLICATION_SUBMITTED,
      entityType: NotificationEntityType.BRAND_APPLICATION,
      entityId: randomUUID(),
      metadata: { brandName: "Uniqlol" },
    });

    const [reviewerNotification] = await notificationsFor(brandReviewer.userId);
    expect(reviewerNotification?.type).toBe(NotificationType.BRAND_APPLICATION_SUBMITTED);
    expect(reviewerNotification?.organizationId).toBe(platformOrganization.id);
    expect(await notificationsFor(supportAgent.userId)).toHaveLength(0);
  });

  it("never notifies the person who caused it", async () => {
    const couponCreator = await createRoleLimitedStaffSession("platform:coupons:manage");
    const couponApprover = await createRoleLimitedStaffSession("platform:coupons:manage");

    await notificationService.notifyPlatformStaff({
      actorId: couponCreator.userId,
      type: NotificationType.COUPON_APPROVAL_REQUESTED,
      entityType: NotificationEntityType.COUPON,
      entityId: randomUUID(),
      metadata: { couponCode: "DASHAIN", totalBudgetAmount: 5000 },
    });

    expect(await notificationsFor(couponCreator.userId)).toHaveLength(0);
    expect(await notificationsFor(couponApprover.userId)).toHaveLength(1);
  });
});

describe("notificationService.notifyTenantStaff", () => {
  it("notifies only that tenant's members whose role holds the permission, plus the owner", async () => {
    const { organization, billingManager, salesMember, owner } = await seedTenantWithBillingTeam();
    const otherTenant = await seedTenantWithBillingTeam();

    await notificationService.notifyTenantStaff(organization.id, {
      type: NotificationType.CRM_INVOICE_DUE,
      entityType: NotificationEntityType.CRM_SUBSCRIPTION_INVOICE,
      entityId: randomUUID(),
      metadata: { crmInvoiceAmount: 2700 },
    });

    expect(await notificationsFor(billingManager.userId)).toHaveLength(1);
    expect(await notificationsFor(owner.userId)).toHaveLength(1);
    expect(await notificationsFor(salesMember.userId)).toHaveLength(0);
    expect(await notificationsFor(otherTenant.billingManager.userId)).toHaveLength(0);
  });

  it("tags the notification with the tenant and links to that tenant's admin", async () => {
    const { organization, billingManager } = await seedTenantWithBillingTeam();

    await notificationService.notifyTenantStaff(organization.id, {
      type: NotificationType.CRM_SUBSCRIPTION_PAST_DUE,
      entityType: NotificationEntityType.CRM_SUBSCRIPTION,
      entityId: randomUUID(),
      metadata: {},
    });

    const [pastDueNotification] = await notificationsFor(billingManager.userId);
    expect(pastDueNotification?.organizationId).toBe(organization.id);
    expect(pastDueNotification?.metadata).toMatchObject({
      crmOrganizationName: organization.name,
      crmOrganizationSubdomain: organization.subdomain,
    });
    expect(pastDueNotification?.targetPath).toContain(`${organization.subdomain}.`);
    expect(pastDueNotification?.targetPath).toMatch(/\/crm\/billing$/);
  });

  it("does nothing for an organization that no longer exists", async () => {
    await expect(
      notificationService.notifyTenantStaff(randomUUID(), {
        type: NotificationType.CRM_MEMBER_JOINED,
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });
});

describe("a retried event", () => {
  it("creates a notification only once for the same event", async () => {
    const { organization, billingManager } = await seedTenantWithBillingTeam();
    const invoiceDueNotification = {
      type: NotificationType.CRM_INVOICE_DUE,
      sourceEventId: `crm.invoice.opened:${randomUUID()}`,
      entityType: NotificationEntityType.CRM_SUBSCRIPTION_INVOICE,
      entityId: randomUUID(),
      metadata: { crmInvoiceAmount: 2700 },
    } as const;

    await notificationService.notifyTenantStaff(organization.id, invoiceDueNotification);
    await notificationService.notifyTenantStaff(organization.id, invoiceDueNotification);

    expect(await notificationsFor(billingManager.userId)).toHaveLength(1);
  });

  it("still creates a notification for each different event", async () => {
    const { organization, billingManager } = await seedTenantWithBillingTeam();
    const invoiceDueNotification = {
      type: NotificationType.CRM_INVOICE_DUE,
      entityType: NotificationEntityType.CRM_SUBSCRIPTION_INVOICE,
      entityId: randomUUID(),
      metadata: {},
    } as const;

    await notificationService.notifyTenantStaff(organization.id, {
      ...invoiceDueNotification,
      sourceEventId: `crm.invoice.opened:${randomUUID()}`,
    });
    await notificationService.notifyTenantStaff(organization.id, {
      ...invoiceDueNotification,
      sourceEventId: `crm.invoice.opened:${randomUUID()}`,
    });

    expect(await notificationsFor(billingManager.userId)).toHaveLength(2);
  });
});

describe("notificationService.clearOrganizationNotificationsFor", () => {
  it("removes only that organization's notifications from the person's bell", async () => {
    const { organization, billingManager } = await seedTenantWithBillingTeam();
    await notificationService.notifyTenantStaff(organization.id, {
      type: NotificationType.CRM_INVOICE_DUE,
      metadata: {},
    });
    await prisma.notification.create({
      data: {
        recipientId: billingManager.userId,
        type: NotificationType.LEVEL_UP,
        metadata: { levelName: "Rising Star" },
      },
    });

    await notificationService.clearOrganizationNotificationsFor(
      billingManager.userId,
      organization.id,
    );

    const remaining = await notificationsFor(billingManager.userId);
    expect(remaining.map(({ type }) => type)).toEqual([NotificationType.LEVEL_UP]);
  });
});
