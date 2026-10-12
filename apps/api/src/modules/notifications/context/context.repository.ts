import { isStaffUserRole } from "@outfiqe/utils";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, MembershipStatus, UserRole } from "#generated/prisma/enums.js";

import type {
  NotificationActorSnapshot,
  NotificationMembershipGrant,
  NotificationRecipientAudience,
} from "../notification.types.js";

export const notificationContextRepository = {
  async findActorSnapshot(userId: string): Promise<NotificationActorSnapshot | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        handle: true,
        avatarUrl: true,
        isCreator: true,
        creatorStatus: true,
        memberships: { select: { brandId: true }, take: 1 },
      },
    });
    if (!user) return null;

    const { creatorStatus, isCreator, memberships, ...actor } = user;
    return {
      ...actor,
      isCreator: isCreator && creatorStatus === CreatorStatus.APPROVED,
      brandId: memberships[0]?.brandId ?? null,
    };
  },

  async findLookSnapshot(
    lookId: string,
  ): Promise<{ imageUrl: string; caption: string | null; ownerHandle: string } | null> {
    const look = await prisma.creatorLook.findUnique({
      where: { id: lookId },
      select: { imageUrl: true, caption: true, creator: { select: { handle: true } } },
    });
    if (!look) return null;
    return { imageUrl: look.imageUrl, caption: look.caption, ownerHandle: look.creator.handle };
  },

  async findBrandName(brandId: string): Promise<string | null> {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
    return brand?.name ?? null;
  },

  async findBrandMemberIds(brandId: string): Promise<string[]> {
    const rows = await prisma.brandMembership.findMany({
      where: { brandId },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  },

  async findProductReviewSnapshot(
    productId: string,
  ): Promise<{ brandId: string; name: string; imageUrl: string | null } | null> {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { brandId: true, name: true, imageUrl: true },
    });
  },

  async findDeliveredOrderProducts(
    orderId: string,
  ): Promise<{ productId: string; productName: string; imageUrl: string | null }[]> {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { product: { select: { id: true, name: true, imageUrl: true } } },
    });

    const byProductId = new Map(
      items.map(({ product: { id, name, imageUrl } }) => [
        id,
        { productId: id, productName: name, imageUrl },
      ]),
    );
    return [...byProductId.values()];
  },

  async findOrderNotificationContext(
    orderId: string,
  ): Promise<{ total: number; brandIds: string[] } | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        total: true,
        items: { select: { product: { select: { brandId: true } } } },
      },
    });
    if (!order) return null;

    const brandIds = [...new Set(order.items.map((item) => item.product.brandId))];
    return { total: order.total, brandIds };
  },

  async findRecipientAudience(userId: string): Promise<NotificationRecipientAudience> {
    const [account, brandMembership, memberships] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isCreator: true, creatorStatus: true },
      }),
      prisma.brandMembership.findFirst({ where: { userId }, select: { brandId: true } }),
      prisma.membership.findMany({
        where: { userId, status: MembershipStatus.ACTIVE },
        select: {
          id: true,
          isPlatformSuperAdmin: true,
          organization: { select: { isPlatformOrg: true, superAdminMembershipId: true } },
          role: { select: { permissions: { select: { permissionKey: true } } } },
        },
      }),
    ]);
    const membershipGrants: NotificationMembershipGrant[] = memberships.map(
      ({ id, isPlatformSuperAdmin, organization, role }) => ({
        isPlatformOrganization: organization.isPlatformOrg,
        isOwner: isPlatformSuperAdmin || organization.superAdminMembershipId === id,
        permissionKeys: role.permissions.map(({ permissionKey }) => permissionKey),
      }),
    );
    return {
      isStaffAccount: isStaffUserRole(account?.role),
      isShopperAccount: account?.role === UserRole.CUSTOMER,
      isApprovedCreator:
        Boolean(account?.isCreator) && account?.creatorStatus === CreatorStatus.APPROVED,
      isBrandMember: brandMembership !== null,
      membershipGrants,
    };
  },
};
