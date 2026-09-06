import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  FulfilmentStatus,
  type PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type {
  BrandCommissionExemptionRecord,
  CreatePendingBrandPayoutInput,
  GatewayFeeRateRecord,
  PlatformCommissionRuleRecord,
  PlatformCommissionTierInput,
} from "./brandPayout.types.js";

const TIER_ORDER_BY = { sortOrder: "asc" as const };

export const brandPayoutRepository = {
  async findActiveRuleWithTiers(
    client: DbClient = prisma,
  ): Promise<PlatformCommissionRuleRecord | null> {
    return client.platformCommissionRule.findFirst({
      where: { isActive: true },
      include: { tiers: { orderBy: TIER_ORDER_BY } },
    });
  },

  async listRulesWithTiers(): Promise<PlatformCommissionRuleRecord[]> {
    return prisma.platformCommissionRule.findMany({
      orderBy: { createdAt: "desc" },
      include: { tiers: { orderBy: TIER_ORDER_BY } },
    });
  },

  async createActiveRuleVersion(
    tiers: PlatformCommissionTierInput[],
    adminId: string,
  ): Promise<PlatformCommissionRuleRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.platformCommissionRule.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      return tx.platformCommissionRule.create({
        data: {
          isActive: true,
          updatedById: adminId,
          tiers: {
            create: tiers.map((tier, index) => ({ ...tier, sortOrder: index })),
          },
        },
        include: { tiers: { orderBy: TIER_ORDER_BY } },
      });
    });
  },

  async findActiveGatewayFeeRate(
    paymentMethod: PaymentMethod,
    client: DbClient = prisma,
  ): Promise<GatewayFeeRateRecord | null> {
    return client.gatewayFeeRate.findFirst({ where: { paymentMethod, isActive: true } });
  },

  async listGatewayFeeRates(): Promise<GatewayFeeRateRecord[]> {
    return prisma.gatewayFeeRate.findMany({
      orderBy: [{ paymentMethod: "asc" }, { createdAt: "desc" }],
    });
  },

  async createActiveGatewayFeeRateVersion(
    paymentMethod: PaymentMethod,
    ratePercentBasisPoints: number,
    adminId: string,
  ): Promise<GatewayFeeRateRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.gatewayFeeRate.updateMany({
        where: { paymentMethod, isActive: true },
        data: { isActive: false },
      });
      return tx.gatewayFeeRate.create({
        data: { paymentMethod, ratePercentBasisPoints, isActive: true, updatedById: adminId },
      });
    });
  },

  async findActiveExemptBrandIds(
    brandIds: string[],
    at: Date,
    client: DbClient = prisma,
  ): Promise<Set<string>> {
    if (brandIds.length === 0) return new Set();

    const rows = await client.brandCommissionExemption.findMany({
      where: {
        brandId: { in: brandIds },
        startsAt: { lte: at },
        endsAt: { gte: at },
        revokedAt: null,
      },
      select: { brandId: true },
    });
    return new Set(rows.map((row) => row.brandId));
  },

  async listExemptions(brandId?: string): Promise<BrandCommissionExemptionRecord[]> {
    const rows = await prisma.brandCommissionExemption.findMany({
      where: brandId ? { brandId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { brand: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      brandId: row.brandId,
      brandName: row.brand.name,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      reason: row.reason,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    }));
  },

  async createExemption(
    input: { brandId: string; startsAt: Date; endsAt: Date; reason: string },
    adminId: string,
  ): Promise<BrandCommissionExemptionRecord> {
    const row = await prisma.brandCommissionExemption.create({
      data: { ...input, createdById: adminId },
      include: { brand: { select: { name: true } } },
    });
    return {
      id: row.id,
      brandId: row.brandId,
      brandName: row.brand.name,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      reason: row.reason,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    };
  },

  async revokeExemption(id: string, adminId: string): Promise<boolean> {
    const result = await prisma.brandCommissionExemption.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), revokedById: adminId },
    });
    return result.count > 0;
  },

  async createPending(client: DbClient, input: CreatePendingBrandPayoutInput): Promise<void> {
    await client.brandPayout.create({ data: input });
  },

  async findApprovableIds(deliveredBefore: Date): Promise<string[]> {
    const rows = await prisma.brandPayout.findMany({
      where: {
        status: BrandPayoutStatus.PENDING,
        orderItem: {
          order: {
            fulfilmentStatus: FulfilmentStatus.DELIVERED,
            deliveredAt: { lte: deliveredBefore },
          },
        },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findVoidableForCancelledIds(): Promise<string[]> {
    const rows = await prisma.brandPayout.findMany({
      where: {
        status: BrandPayoutStatus.PENDING,
        orderItem: { order: { fulfilmentStatus: FulfilmentStatus.CANCELLED } },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findVoidableForFailedPaymentIds(): Promise<string[]> {
    const rows = await prisma.brandPayout.findMany({
      where: {
        status: BrandPayoutStatus.PENDING,
        orderItem: {
          order: { paymentStatus: { in: [PaymentStatus.FAILED, PaymentStatus.REFUNDED] } },
        },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async approve(id: string): Promise<boolean> {
    const result = await prisma.brandPayout.updateMany({
      where: { id, status: BrandPayoutStatus.PENDING },
      data: { status: BrandPayoutStatus.AVAILABLE, availableAt: new Date() },
    });
    return result.count > 0;
  },

  async void(id: string, voidedReason: string): Promise<boolean> {
    const result = await prisma.brandPayout.updateMany({
      where: { id, status: BrandPayoutStatus.PENDING },
      data: { status: BrandPayoutStatus.VOIDED, voidedReason },
    });
    return result.count > 0;
  },

  async voidForOrder(client: DbClient, orderId: string, voidedReason: string): Promise<number> {
    const result = await client.brandPayout.updateMany({
      where: { orderItem: { orderId }, status: BrandPayoutStatus.PENDING },
      data: { status: BrandPayoutStatus.VOIDED, voidedReason },
    });
    return result.count;
  },

  async sumByStatusForBrand(brandId: string): Promise<Partial<Record<BrandPayoutStatus, number>>> {
    const grouped = await prisma.brandPayout.groupBy({
      by: ["status"],
      where: { brandId },
      _sum: { netAmount: true },
    });

    const sums: Partial<Record<BrandPayoutStatus, number>> = {};
    for (const { status, _sum } of grouped) {
      sums[status] = _sum.netAmount ?? 0;
    }
    return sums;
  },

  async listForBrand(brandId: string, params: { cursor?: string; limit: number }) {
    return prisma.brandPayout.findMany({
      where: { brandId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        orderItem: {
          select: {
            platformDiscountAmount: true,
            product: { select: { name: true, imageUrl: true } },
          },
        },
      },
    });
  },

  async claimAvailableForBrand(
    client: DbClient,
    brandId: string,
    amount: number,
  ): Promise<string[]> {
    const candidates = await client.brandPayout.findMany({
      where: { brandId, status: BrandPayoutStatus.AVAILABLE },
      orderBy: { createdAt: "asc" },
      select: { id: true, netAmount: true },
    });

    const claimedIds: string[] = [];
    let runningTotal = 0;
    for (const candidate of candidates) {
      if (runningTotal >= amount) break;
      claimedIds.push(candidate.id);
      runningTotal += candidate.netAmount;
    }
    if (runningTotal < amount) return [];

    const result = await client.brandPayout.updateMany({
      where: { id: { in: claimedIds }, status: BrandPayoutStatus.AVAILABLE },
      data: { status: BrandPayoutStatus.WITHDRAWN, withdrawnAt: new Date() },
    });
    return result.count === claimedIds.length ? claimedIds : [];
  },
};
