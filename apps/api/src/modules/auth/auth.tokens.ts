import { randomUUID } from "node:crypto";

import { addMilliseconds } from "date-fns/addMilliseconds";
import { fromUnixTime } from "date-fns/fromUnixTime";
import { getUnixTime } from "date-fns/getUnixTime";
import jwt from "jsonwebtoken";

import { env } from "#config/env.config.js";
import type { TokenPurpose } from "#constants/enums/auth.enum.js";
import { TokenTypeEnum } from "#constants/enums/auth.enum.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { parseDurationMs } from "#lib/duration.utils.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { verifyPurposeToken } from "#lib/purpose-token.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import type { UserRecord } from "#modules/users/user.types.js";
import type { DbClient } from "#types/db.types.js";
import type { PurposeTokenPayload } from "#types/token.types.js";

import { MS_PER_SECOND, PURPOSE_ERROR_COPY } from "./auth.constants.js";
import { authRepository } from "./auth.repository.js";
import type { IssuedTokens } from "./auth.types.js";

export const verifyPurposeTokenOrThrow = async (
  token: string,
  purpose: TokenPurpose,
): Promise<PurposeTokenPayload> => {
  const copy = PURPOSE_ERROR_COPY[purpose];

  let tokenPayload: PurposeTokenPayload;
  try {
    tokenPayload = verifyPurposeToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError("TOKEN_EXPIRED", copy.expired, HTTP_STATUS.BAD_REQUEST);
    }
    throw new AppError("INVALID_TOKEN", copy.invalid, HTTP_STATUS.BAD_REQUEST);
  }

  if (tokenPayload.purpose !== purpose) {
    throw new AppError("INVALID_TOKEN", copy.invalid, HTTP_STATUS.BAD_REQUEST);
  }

  const alreadyUsed = await authRepository.findUsedPurposeToken(tokenPayload.jti);
  if (alreadyUsed) {
    throw new AppError("INVALID_TOKEN", copy.invalid, HTTP_STATUS.BAD_REQUEST);
  }

  return tokenPayload;
};

const purposeTokenExpiry = (tokenPayload: PurposeTokenPayload): Date =>
  fromUnixTime(tokenPayload.exp ?? getUnixTime(new Date()));

const isUniqueConstraintViolation = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "P2002";

export const redeemPurposeTokenOrThrow = async (
  tokenPayload: PurposeTokenPayload,
  purpose: TokenPurpose,
  applyEffect: (tx: DbClient) => Promise<void>,
): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      await applyEffect(tx);
      await authRepository.markPurposeTokenUsed(
        tokenPayload.jti,
        purpose,
        purposeTokenExpiry(tokenPayload),
        tx,
      );
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new AppError(
        "INVALID_TOKEN",
        PURPOSE_ERROR_COPY[purpose].invalid,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    throw err;
  }
};

export const issueTokens = async (
  user: Pick<UserRecord, "id" | "role">,
  familyId: string = randomUUID(),
): Promise<IssuedTokens> => {
  const { id, role } = user;
  const accessToken = generateToken({ sub: id, role }, TokenTypeEnum.ACCESS);

  const rawRefreshToken = generateOpaqueToken();
  const refreshTokenTtlMs = parseDurationMs(env.JWT_REFRESH_TTL);

  await authRepository.createRefreshToken({
    userId: id,
    tokenHash: hashToken(rawRefreshToken),
    familyId,
    expiresAt: addMilliseconds(new Date(), refreshTokenTtlMs),
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    refreshTokenTtlSeconds: Math.floor(refreshTokenTtlMs / MS_PER_SECOND),
  };
};
