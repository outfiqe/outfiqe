import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { BrandReturnStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const PAGE_LOOKAHEAD = 1;
const NOTHING_UPDATED = 0;

const brandReturnViewSelect = {
  id: true,
  source: true,
  status: true,
  createdAt: true,
  droppedOffAt: true,
  confirmedAt: true,
  isAutoConfirmed: true,
  fulfilmentGroup: { select: { orderId: true } },
  lines: {
    orderBy: { id: "asc" },
    select: {
      resellableQty: true,
      damagedQty: true,
      orderItem: {
        select: { product: { select: { name: true } }, size: { select: { label: true } } },
      },
    },
  },
} satisfies Prisma.BrandReturnSelect;

export type BrandReturnViewRecord = Prisma.BrandReturnGetPayload<{
  select: typeof brandReturnViewSelect;
}>;

const brandReturnToConfirmSelect = {
  id: true,
  brandId: true,
  source: true,
  status: true,
  fulfilmentGroupId: true,
  lines: { select: { resellableQty: true, orderItem: { select: { sizeId: true } } } },
} satisfies Prisma.BrandReturnSelect;

export type BrandReturnToConfirmRecord = Prisma.BrandReturnGetPayload<{
  select: typeof brandReturnToConfirmSelect;
}>;

export const logisticsBrandReturnRepository = {
  async listForBrand(params: {
    brandId: string;
    status?: BrandReturnStatus;
    cursor?: string;
    limit: number;
  }): Promise<BrandReturnViewRecord[]> {
    return prisma.brandReturn.findMany({
      where: { brandId: params.brandId, ...(params.status ? { status: params.status } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: brandReturnViewSelect,
    });
  },

  async findView(brandReturnId: string): Promise<BrandReturnViewRecord | null> {
    return prisma.brandReturn.findUnique({
      where: { id: brandReturnId },
      select: brandReturnViewSelect,
    });
  },

  async findToConfirm(
    client: DbClient,
    brandReturnId: string,
  ): Promise<BrandReturnToConfirmRecord | null> {
    return client.brandReturn.findUnique({
      where: { id: brandReturnId },
      select: brandReturnToConfirmSelect,
    });
  },

  async markConfirmed(
    client: DbClient,
    params: {
      brandReturnId: string;
      confirmedById: string | null;
      confirmedAt: Date;
      isAutoConfirmed: boolean;
    },
  ): Promise<boolean> {
    const { brandReturnId, ...confirmation } = params;
    const { count } = await client.brandReturn.updateMany({
      where: { id: brandReturnId, status: BrandReturnStatus.DROPPED_OFF },
      data: { ...confirmation, status: BrandReturnStatus.CONFIRMED },
    });
    return count > NOTHING_UPDATED;
  },

  async listOverdueDropOffIds(params: { droppedOffBefore: Date; limit: number }) {
    const overdueReturns = await prisma.brandReturn.findMany({
      where: {
        status: BrandReturnStatus.DROPPED_OFF,
        droppedOffAt: { lt: params.droppedOffBefore },
      },
      orderBy: { droppedOffAt: "asc" },
      take: params.limit,
      select: { id: true },
    });
    return overdueReturns.map(({ id }) => id);
  },
};
