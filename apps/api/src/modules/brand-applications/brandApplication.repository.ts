import { prisma } from "../../shared/db/prisma.js";

import { BrandApplicationStatus } from "../../generated/prisma/enums.js";
import type {
  ApproveBrandApplicationInput,
  BrandApplicationRecord,
  CreateBrandApplicationInput,
} from "./brandApplication.types.js";

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
    return prisma.brandApplication.update({
      where: { id },
      data: { status: BrandApplicationStatus.REJECTED, reviewedAt: new Date(), reviewedById },
    });
  },

  async approve(
    application: BrandApplicationRecord,
    input: ApproveBrandApplicationInput,
  ): Promise<{ brandId: string }> {
    const brand = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: {
          name: application.brandName,
          category: application.category,
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

      await tx.brandApplication.update({
        where: { id: application.id },
        data: {
          status: BrandApplicationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: input.reviewedById,
        },
      });

      return brand;
    });

    return { brandId: brand.id };
  },
};
