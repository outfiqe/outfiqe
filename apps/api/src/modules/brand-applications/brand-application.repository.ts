import { prisma } from "#db/prisma.js";
import { BrandApplicationStatus } from "#generated/prisma/enums.js";

import { brandApplicationErrors } from "./brand-application.errors.js";
import type {
  ApproveBrandApplicationInput,
  BrandApplicationRecord,
  BrandApplicationSummary,
  CreateBrandApplicationInput,
  RotateBrandInviteInput,
} from "./brand-application.types.js";

const NO_INVITES_ROTATED = 0;
const NO_UNACCEPTED_INVITES = 0;
const INVITE_ROTATED = true;
const INVITE_NOT_ROTATED = false;

const requireClaimedPendingRow = (claimedCount: number): void => {
  if (claimedCount === 0) {
    throw brandApplicationErrors.alreadyReviewed();
  }
};

export const brandApplicationRepository = {
  async create(input: CreateBrandApplicationInput): Promise<BrandApplicationRecord> {
    return prisma.brandApplication.create({ data: input });
  },

  async list(
    status: BrandApplicationStatus | undefined,
    params: { cursor?: string; limit: number },
  ): Promise<BrandApplicationSummary[]> {
    const applications = await prisma.brandApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        brand: {
          select: { _count: { select: { invites: { where: { acceptedAt: null } } } } },
        },
      },
    });

    return applications.map(({ brand, ...application }) => ({
      ...application,
      isAwaitingBrandSetup:
        (brand?._count.invites ?? NO_UNACCEPTED_INVITES) > NO_UNACCEPTED_INVITES,
    }));
  },

  async findById(id: string): Promise<BrandApplicationRecord | null> {
    return prisma.brandApplication.findUnique({ where: { id } });
  },

  async reject(id: string, reviewedById: string): Promise<BrandApplicationRecord> {
    return prisma.$transaction(async (tx) => {
      const claim = await tx.brandApplication.updateMany({
        where: { id, status: BrandApplicationStatus.PENDING },
        data: { status: BrandApplicationStatus.REJECTED, reviewedAt: new Date(), reviewedById },
      });
      requireClaimedPendingRow(claim.count);

      return tx.brandApplication.findUniqueOrThrow({ where: { id } });
    });
  },

  async approve(
    application: BrandApplicationRecord,
    input: ApproveBrandApplicationInput,
  ): Promise<{ brandId: string }> {
    const brand = await prisma.$transaction(async (tx) => {
      const claim = await tx.brandApplication.updateMany({
        where: { id: application.id, status: BrandApplicationStatus.PENDING },
        data: {
          status: BrandApplicationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: input.reviewedById,
        },
      });
      requireClaimedPendingRow(claim.count);

      const brand = await tx.brand.create({
        data: {
          name: application.brandName,
          contactName: application.contactName,
          email: application.email,
          phone: application.phone,
          instagram: application.instagram,
          applicationId: application.id,
        },
      });

      await tx.brandInvite.create({
        data: {
          brandId: brand.id,
          email: application.email,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          approvedById: input.reviewedById,
        },
      });

      return brand;
    });

    return { brandId: brand.id };
  },

  async rotateUnacceptedInvite(
    applicationId: string,
    { tokenHash, expiresAt }: RotateBrandInviteInput,
  ): Promise<boolean> {
    const { count } = await prisma.brandInvite.updateMany({
      where: { acceptedAt: null, brand: { applicationId } },
      data: { tokenHash, expiresAt },
    });
    return count === NO_INVITES_ROTATED ? INVITE_NOT_ROTATED : INVITE_ROTATED;
  },
};
