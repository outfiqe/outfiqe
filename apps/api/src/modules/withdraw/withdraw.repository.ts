import { prisma } from "#db/prisma.js";
import type { WithdrawOwnerType, WithdrawWindowType } from "#generated/prisma/enums.js";
import { LedgerEntryKind, WithdrawRequestStatus } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import type { DbClient } from "#types/db.types.js";

import { DEFAULT_WITHDRAW_POLICY } from "./withdraw.constants.js";
import type {
  CreateWithdrawRequestInput,
  OwnerContext,
  WithdrawPolicyRecord,
  WithdrawRequestRecord,
} from "./withdraw.types.js";

type WithdrawPolicyFields = {
  minAmount: number;
  maxAmount: number;
  windowType: WithdrawWindowType;
  windowValue: number;
  maxAttemptsPerWindow: number;
  cooldownAfterRejectionDays: number;
  processingNoteText: string;
};

const RESERVED_STATUSES: WithdrawRequestStatus[] = [
  WithdrawRequestStatus.PENDING,
  WithdrawRequestStatus.UNDER_REVIEW,
  WithdrawRequestStatus.APPROVED,
];

const ownerWhere = (owner: OwnerContext): { creatorId: string } | { brandId: string } =>
  owner.ownerType === "CREATOR" ? { creatorId: owner.creatorId } : { brandId: owner.brandId };

export const withdrawRepository = {
  async getOrCreateActivePolicy(
    ownerType: WithdrawOwnerType,
    client: DbClient = prisma,
  ): Promise<WithdrawPolicyRecord> {
    const existing = await client.withdrawPolicy.findFirst({
      where: { ownerType, isActive: true },
    });
    if (existing) return existing;

    const defaults = DEFAULT_WITHDRAW_POLICY[ownerType];
    const inserted = await client.$queryRaw<WithdrawPolicyRecord[]>`
      INSERT INTO "withdraw_policies" (
        "id", "owner_type", "min_amount", "max_amount", "window_type", "window_value",
        "max_attempts_per_window", "cooldown_after_rejection_days", "processing_note_text",
        "is_active", "updated_by_id", "created_at"
      )
      VALUES (
        gen_random_uuid(), ${ownerType}, ${defaults.minAmount}, ${defaults.maxAmount},
        ${defaults.windowType}, ${defaults.windowValue}, ${defaults.maxAttemptsPerWindow},
        ${defaults.cooldownAfterRejectionDays}, ${defaults.processingNoteText}, true, NULL,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("owner_type") WHERE "is_active" = true DO NOTHING
      RETURNING
        "id", "owner_type" AS "ownerType", "min_amount" AS "minAmount", "max_amount" AS "maxAmount",
        "window_type" AS "windowType", "window_value" AS "windowValue",
        "max_attempts_per_window" AS "maxAttemptsPerWindow",
        "cooldown_after_rejection_days" AS "cooldownAfterRejectionDays",
        "processing_note_text" AS "processingNoteText", "is_active" AS "isActive",
        "created_at" AS "createdAt"
    `;

    if (inserted[0]) {
      logger.warn(
        `Bootstrapped a default WithdrawPolicy for ownerType=${ownerType} — no active policy existed. An admin should review and save the policy in the admin panel.`,
      );
      return inserted[0];
    }

    const wonByConcurrentInsert = await client.withdrawPolicy.findFirst({
      where: { ownerType, isActive: true },
    });
    if (!wonByConcurrentInsert) {
      throw new Error(`Failed to bootstrap a WithdrawPolicy for ownerType=${ownerType}`);
    }
    return wonByConcurrentInsert;
  },

  async createActiveVersion(
    ownerType: OwnerContext["ownerType"],
    fields: WithdrawPolicyFields,
    adminId: string,
  ): Promise<WithdrawPolicyRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.withdrawPolicy.updateMany({
        where: { ownerType, isActive: true },
        data: { isActive: false },
      });
      return tx.withdrawPolicy.create({
        data: { ownerType, ...fields, isActive: true, updatedById: adminId },
      });
    });
  },

  async countRequestsSince(
    owner: OwnerContext,
    since: Date,
    client: DbClient = prisma,
  ): Promise<number> {
    return client.withdrawRequest.count({
      where: { ...ownerWhere(owner), createdAt: { gte: since } },
    });
  },

  async findMostRecentRejection(
    owner: OwnerContext,
    client: DbClient = prisma,
  ): Promise<WithdrawRequestRecord | null> {
    return client.withdrawRequest.findFirst({
      where: { ...ownerWhere(owner), status: WithdrawRequestStatus.REJECTED },
      orderBy: { reviewedAt: "desc" },
    });
  },

  async sumReservedAmount(owner: OwnerContext, client: DbClient = prisma): Promise<number> {
    const result = await client.withdrawRequest.aggregate({
      where: { ...ownerWhere(owner), status: { in: RESERVED_STATUSES } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  },

  async create(
    client: DbClient,
    input: CreateWithdrawRequestInput & {
      policyId: string;
      status: WithdrawRequestStatus;
      requiresSecondSignOff: boolean;
    },
  ): Promise<WithdrawRequestRecord> {
    const { owner, requestedById, bankAccountId, amount, policyId, status, requiresSecondSignOff } =
      input;

    return client.withdrawRequest.create({
      data: {
        ownerType: owner.ownerType,
        creatorId: owner.ownerType === "CREATOR" ? owner.creatorId : undefined,
        brandId: owner.ownerType === "BUSINESS" ? owner.brandId : undefined,
        requestedById,
        bankAccountId: owner.ownerType === "CREATOR" ? bankAccountId : undefined,
        brandBankAccountId: owner.ownerType === "BUSINESS" ? bankAccountId : undefined,
        policyId,
        amount,
        status,
        requiresSecondSignOff,
      },
    });
  },

  async listForOwner(
    owner: OwnerContext,
    params: { cursor?: string; limit: number },
  ): Promise<WithdrawRequestRecord[]> {
    return prisma.withdrawRequest.findMany({
      where: ownerWhere(owner),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
  },

  async findById(id: string, client: DbClient = prisma): Promise<WithdrawRequestRecord | null> {
    return client.withdrawRequest.findUnique({ where: { id } });
  },

  async listAllAdmin(params: { status?: WithdrawRequestStatus; cursor?: string; limit: number }) {
    return prisma.withdrawRequest.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        creator: { select: { name: true } },
        brand: { select: { name: true } },
        bankAccount: { select: { accountNumberLast4: true } },
        brandBankAccount: { select: { accountNumberLast4: true } },
      },
    });
  },

  async approveDirect(id: string, adminId: string, client: DbClient = prisma): Promise<boolean> {
    const result = await client.withdrawRequest.updateMany({
      where: { id, status: WithdrawRequestStatus.PENDING },
      data: {
        status: WithdrawRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    return result.count > 0;
  },

  async approveFirstSignOff(
    id: string,
    adminId: string,
    client: DbClient = prisma,
  ): Promise<boolean> {
    const result = await client.withdrawRequest.updateMany({
      where: {
        id,
        status: WithdrawRequestStatus.UNDER_REVIEW,
        requiresSecondSignOff: true,
        firstApprovedById: null,
      },
      data: { firstApprovedById: adminId, firstApprovedAt: new Date() },
    });
    return result.count > 0;
  },

  async approveSecondSignOff(
    id: string,
    adminId: string,
    client: DbClient = prisma,
  ): Promise<boolean> {
    const result = await client.withdrawRequest.updateMany({
      where: {
        id,
        status: WithdrawRequestStatus.UNDER_REVIEW,
        requiresSecondSignOff: true,
        AND: [{ firstApprovedById: { not: null } }, { firstApprovedById: { not: adminId } }],
      },
      data: {
        status: WithdrawRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    return result.count > 0;
  },

  async reject(
    id: string,
    adminId: string,
    reason: string,
    client: DbClient = prisma,
  ): Promise<boolean> {
    const result = await client.withdrawRequest.updateMany({
      where: {
        id,
        status: {
          in: [
            WithdrawRequestStatus.PENDING,
            WithdrawRequestStatus.UNDER_REVIEW,
            WithdrawRequestStatus.APPROVED,
          ],
        },
      },
      data: {
        status: WithdrawRequestStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    return result.count > 0;
  },

  async markPaid(
    id: string,
    adminId: string,
    referenceNote: string,
    client: DbClient = prisma,
  ): Promise<boolean> {
    const result = await client.withdrawRequest.updateMany({
      where: { id, status: WithdrawRequestStatus.APPROVED },
      data: {
        status: WithdrawRequestStatus.PAID,
        paidById: adminId,
        paidAt: new Date(),
        referenceNote,
      },
    });
    return result.count > 0;
  },

  async createLedgerEntries(
    client: DbClient,
    withdrawRequestId: string,
    entryKind: LedgerEntryKind,
    claimedIds: string[],
  ): Promise<void> {
    await client.withdrawRequestLedgerEntry.createMany({
      data: claimedIds.map((claimedId) => ({
        withdrawRequestId,
        entryKind,
        creatorCommissionId:
          entryKind === LedgerEntryKind.CREATOR_COMMISSION ? claimedId : undefined,
        brandPayoutId: entryKind === LedgerEntryKind.BRAND_PAYOUT ? claimedId : undefined,
      })),
    });
  },
};
