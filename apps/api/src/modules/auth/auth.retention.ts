import { subDays } from "date-fns/subDays";

import { prisma } from "#db/prisma.js";
import logger from "#lib/winston.utils.js";

import { REFRESH_TOKEN_RETENTION_DAYS } from "./auth.constants.js";

export const runAuthRetentionSweep = async (): Promise<{
  deletedRefreshTokens: number;
  deletedUsedPurposeTokens: number;
}> => {
  const cutoff = subDays(new Date(), REFRESH_TOKEN_RETENTION_DAYS);
  const now = new Date();

  const [{ count: deletedRefreshTokens }, { count: deletedUsedPurposeTokens }] = await Promise.all([
    prisma.refreshToken.deleteMany({
      where: {
        OR: [{ revokedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }],
      },
    }),
    prisma.usedPurposeToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  if (deletedRefreshTokens > 0) {
    logger.info(`Auth retention sweep deleted ${deletedRefreshTokens} stale refresh tokens`);
  }
  if (deletedUsedPurposeTokens > 0) {
    logger.info(
      `Auth retention sweep deleted ${deletedUsedPurposeTokens} expired used-purpose-token records`,
    );
  }

  return { deletedRefreshTokens, deletedUsedPurposeTokens };
};
