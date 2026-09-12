import { prisma } from "#db/prisma.js";
import { BrandApplicationStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import type {
  ApproveBrandApplicationInput,
  BrandApplicationRecord,
  CreateBrandApplicationInput,
} from "./brandApplication.types.js";

const CONFLICT_STATUS = 409;

const requireClaimedPendingRow = (claimedCount: number): void => {
  if (claimedCount === 0) {
    throw new AppError(
      "ALREADY_REVIEWED",
      "This application has already been reviewed.",
      CONFLICT_STATUS,
    );
  }
};

export const brandApplicationRepository = {
  async create(input: CreateBrandApplicationInput): Promise<BrandApplicationRecord> {
    return prisma.brandApplication.create({ data: input });
  },

  async list(
    status: BrandApplicationStatus | undefined,
    params: { cursor?: string; limit: number },
  ): Promise<BrandApplicationRecord[]> {
    return prisma.brandApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
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
};
