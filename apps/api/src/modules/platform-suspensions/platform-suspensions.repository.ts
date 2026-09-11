import { prisma } from "#db/prisma.js";
import { AccountStatus } from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import type { DbClient } from "#types/db.types.js";

import type { AccountSuspensionState } from "./platform-suspensions.types.js";

const suspensionStateSelect = {
  accountStatus: true,
  suspendedAt: true,
  suspendedBy: true,
  suspensionReason: true,
  suspensionExpiresAt: true,
} as const;

export const platformSuspensionsRepository = {
  async findUserSuspensionState(
    userId: string,
    client: DbClient = prisma,
  ): Promise<AccountSuspensionState | null> {
    return client.user.findUnique({ where: { id: userId }, select: suspensionStateSelect });
  },

  async suspendUser(
    input: {
      userId: string;
      suspendedBy: string;
      reason: string;
      expiresAt: Date | null;
    },
    client: DbClient = prisma,
  ): Promise<boolean> {
    const { count } = await client.user.updateMany({
      where: {
        id: input.userId,
        accountStatus: { notIn: [AccountStatus.SUSPENDED, AccountStatus.BANNED] },
      },
      data: {
        accountStatus: AccountStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy: input.suspendedBy,
        suspensionReason: input.reason,
        suspensionExpiresAt: input.expiresAt,
      },
    });
    return count > 0;
  },

  async banUser(
    input: { userId: string; suspendedBy: string; reason: string },
    client: DbClient = prisma,
  ): Promise<boolean> {
    const { count } = await client.user.updateMany({
      where: { id: input.userId, accountStatus: { not: AccountStatus.BANNED } },
      data: {
        accountStatus: AccountStatus.BANNED,
        suspendedAt: new Date(),
        suspendedBy: input.suspendedBy,
        suspensionReason: input.reason,
        suspensionExpiresAt: null,
      },
    });
    return count > 0;
  },

  async unsuspendUser(userId: string, client: DbClient = prisma): Promise<boolean> {
    const { count } = await client.user.updateMany({
      where: { id: userId, accountStatus: AccountStatus.SUSPENDED },
      data: {
        accountStatus: AccountStatus.ACTIVE,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        suspensionExpiresAt: null,
      },
    });
    return count > 0;
  },

  async unbanUser(userId: string, client: DbClient = prisma): Promise<boolean> {
    const { count } = await client.user.updateMany({
      where: { id: userId, accountStatus: AccountStatus.BANNED },
      data: {
        accountStatus: AccountStatus.ACTIVE,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        suspensionExpiresAt: null,
      },
    });
    return count > 0;
  },

  async findExpiredSuspendedUserIds(now: Date, client: DbClient = prisma): Promise<string[]> {
    const rows = await client.user.findMany({
      where: { accountStatus: AccountStatus.SUSPENDED, suspensionExpiresAt: { lte: now } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findLatestBanActorUserId(
    userId: string,
    client: DbClient = prisma,
  ): Promise<string | null> {
    const entry = await client.platformAuditLog.findFirst({
      where: { targetType: "user", targetId: userId, action: PLATFORM_AUDIT_ACTION.USER_BANNED },
      orderBy: { createdAt: "desc" },
      select: { actorUserId: true },
    });
    return entry?.actorUserId ?? null;
  },
};
