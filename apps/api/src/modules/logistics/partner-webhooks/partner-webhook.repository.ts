import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

const PAGE_LOOKAHEAD = 1;

export const partnerForWebhookSelect = {
  id: true,
  code: true,
  isActive: true,
  adapterKey: true,
  webhookVerification: true,
  accounts: {
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      hubId: true,
      merchantAccountRef: true,
      pickupPointRef: true,
      credentialsKey: true,
    },
  },
} satisfies Prisma.DeliveryPartnerSelect;

export const logisticsPartnerWebhookRepository = {
  async findPartnerByCode(partnerCode: string) {
    return prisma.deliveryPartner.findUnique({
      where: { code: partnerCode },
      select: partnerForWebhookSelect,
    });
  },

  async findPartnerById(partnerId: string) {
    return prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
      select: partnerForWebhookSelect,
    });
  },

  async createReceipt(
    client: DbClient,
    receipt: { partnerId: string; rawBody: string; signatureValid: boolean },
  ) {
    return client.partnerWebhookReceipt.create({ data: receipt, select: { id: true } });
  },

  async findReceipt(receiptId: string) {
    return prisma.partnerWebhookReceipt.findUnique({
      where: { id: receiptId },
      select: { id: true, partnerId: true, rawBody: true, signatureValid: true, processedAt: true },
    });
  },

  async markReceiptProcessed(
    receiptId: string,
    counts: { eventCount: number; appliedCount: number; unknownCount: number },
  ): Promise<void> {
    await prisma.partnerWebhookReceipt.update({
      where: { id: receiptId },
      data: { ...counts, processedAt: new Date(), processingError: null },
    });
  },

  async markReceiptFailed(receiptId: string, processingError: string): Promise<void> {
    await prisma.partnerWebhookReceipt.update({
      where: { id: receiptId },
      data: { processingError },
    });
  },

  async clearReceiptsForReplay(client: DbClient, receiptIds: readonly string[]): Promise<void> {
    await client.partnerWebhookReceipt.updateMany({
      where: { id: { in: [...receiptIds] } },
      data: { processedAt: null, processingError: null },
    });
  },

  async listReceiptIdsToReplay(params: { partnerId: string; since: Date; limit: number }) {
    const receipts = await prisma.partnerWebhookReceipt.findMany({
      where: {
        partnerId: params.partnerId,
        signatureValid: true,
        receivedAt: { gte: params.since },
        OR: [{ processingError: { not: null } }, { unknownCount: { gt: 0 } }],
      },
      orderBy: { receivedAt: "asc" },
      take: params.limit,
      select: { id: true },
    });
    return receipts.map(({ id }) => id);
  },

  async deleteReceiptsReceivedBefore(receivedBefore: Date): Promise<number> {
    const { count } = await prisma.partnerWebhookReceipt.deleteMany({
      where: { receivedAt: { lt: receivedBefore } },
    });
    return count;
  },

  async listReceipts(params: { partnerId: string; cursor?: string; limit: number }) {
    return prisma.partnerWebhookReceipt.findMany({
      where: { partnerId: params.partnerId },
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: {
        id: true,
        signatureValid: true,
        receivedAt: true,
        processedAt: true,
        processingError: true,
        eventCount: true,
        appliedCount: true,
        unknownCount: true,
      },
    });
  },
};
