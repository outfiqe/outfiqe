import { prisma } from "#db/prisma.js";
import logger from "#lib/winston.utils.js";

import { REFRESH_TOKEN_RETENTION_DAYS } from "./auth.constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const runAuthRetentionSweep = async (): Promise<{ deletedRefreshTokens: number }> => {
  const cutoff = new Date(Date.now() - REFRESH_TOKEN_RETENTION_DAYS * DAY_MS);

  const { count: deletedRefreshTokens } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ revokedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }],
    },
  });

  if (deletedRefreshTokens > 0) {
    logger.info(`Auth retention sweep deleted ${deletedRefreshTokens} stale refresh tokens`);
  }

  return { deletedRefreshTokens };
};
