import { isStaffUserRole } from "@outfiqe/utils";
import { addMilliseconds } from "date-fns/addMilliseconds";
import { isPast } from "date-fns/isPast";

import { env } from "#config/env.config.js";
import type { TokenPurpose } from "#constants/enums/auth.enum.js";
import { TokenTypeEnum } from "#constants/enums/auth.enum.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { AccountStatus, UserRole } from "#generated/prisma/enums.js";
import { parseDurationMs } from "#lib/duration.utils.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword, needsRehash, verifyPassword } from "#lib/password.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { userRepository } from "#modules/users/user.repository.js";
import { describeError } from "#redis/redis.utils.js";

import { auditLog } from "../auth.audit.js";
import { verifyCaptcha } from "../auth.captcha.utils.js";
import {
  CAPTCHA_FAILED_MESSAGE,
  LOGIN_CAPTCHA_CHALLENGE_THRESHOLD,
  MS_PER_SECOND,
  USER_NOT_FOUND_MESSAGE,
} from "../auth.constants.js";
import {
  getFailedLoginCount,
  isLockedOut,
  recordFailedLogin,
  resetFailedLogins,
} from "../auth.lockout.utils.js";
import { resolvePlatformFields } from "../auth.platform-fields.js";
import { authRepository } from "../auth.repository.js";
import { issueTokens, verifyPurposeTokenOrThrow } from "../auth.tokens.js";
import type { AuthSession, AuthUser, BrandAuthUser, IssuedTokens } from "../auth.types.js";
import { toAuthUser } from "../auth.utils.js";

const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";

const rehashPasswordInBackground = (userId: string, plaintextPassword: string): void => {
  hashPassword(plaintextPassword)
    .then((newPasswordHash) => userRepository.updatePasswordHash(userId, newPasswordHash))
    .catch((err: unknown) => {
      logger.error(`Password rehash failed for user ${userId}: ${describeError(err)}`);
    });
};

export const authSessionService = {
  async validateToken(token: string, purpose: TokenPurpose): Promise<void> {
    await verifyPurposeTokenOrThrow(token, purpose);
  },

  async login(
    email: string,
    password: string,
    captchaToken?: string,
    remoteIp?: string,
  ): Promise<AuthSession> {
    if (await isLockedOut(email)) {
      auditLog("failure", "Login blocked: account temporarily locked out", {
        event: "login.locked_out",
        email,
        ip: remoteIp,
      });
      throw new AppError(
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const failedLoginCount = await getFailedLoginCount(email);
    if (
      failedLoginCount >= LOGIN_CAPTCHA_CHALLENGE_THRESHOLD &&
      !(await verifyCaptcha(captchaToken, remoteIp))
    ) {
      auditLog("failure", "Login blocked: captcha challenge failed", {
        event: "login.captcha_failed",
        email,
        ip: remoteIp,
      });
      throw new AppError("CAPTCHA_FAILED", CAPTCHA_FAILED_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    const user = await userRepository.findByEmail(email);
    const isValid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !isValid) {
      await recordFailedLogin(email);
      auditLog("failure", "Login failed: invalid credentials", {
        event: "login.invalid_credentials",
        email,
        ip: remoteIp,
      });
      throw new AppError(
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    await resetFailedLogins(email);

    const { id } = user;

    if (user.passwordHash && needsRehash(user.passwordHash)) {
      rehashPasswordInBackground(id, password);
    }

    if (!user.emailVerified) {
      auditLog("failure", "Login blocked: email not verified", {
        event: "login.email_not_verified",
        userId: id,
        email,
        ip: remoteIp,
      });
      throw new AppError(
        "EMAIL_NOT_VERIFIED",
        "Please verify your email before signing in.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      auditLog("failure", "Login blocked: account suspended or banned", {
        event: "login.account_suspended",
        userId: id,
        email,
        ip: remoteIp,
      });
      throw new AppError(
        "ACCOUNT_SUSPENDED",
        "This account has been suspended.",
        HTTP_STATUS.FORBIDDEN,
        { reason: user.suspensionReason, expiresAt: user.suspensionExpiresAt },
      );
    }

    const tokens = await issueTokens(user);

    auditLog("success", "Login succeeded", {
      event: "login.success",
      userId: id,
      email,
      ip: remoteIp,
    });

    return {
      ...tokens,
      user: {
        ...toAuthUser(user),
        ...(await resolvePlatformFields(id, user.role)),
        hasCrmAccess: await crmAccessService.resolveHasCrmAccess(id),
      },
    };
  },

  async refresh(rawRefreshToken: string | undefined, remoteIp?: string): Promise<IssuedTokens> {
    if (!rawRefreshToken) {
      throw new AppError("MISSING_TOKEN", "No refresh token provided.", HTTP_STATUS.UNAUTHORIZED);
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!stored) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", HTTP_STATUS.UNAUTHORIZED);
    }

    const { id: storedId, userId, familyId, expiresAt, revokedAt } = stored;

    if (revokedAt) {
      await authRepository.deleteRefreshTokenFamily(familyId);
      auditLog("failure", "Refresh token reuse detected; token family revoked", {
        event: "refresh.reuse_detected",
        userId,
        ip: remoteIp,
      });
      throw new AppError(
        "TOKEN_REUSE_DETECTED",
        "This session may have been compromised. Please sign in again.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (isPast(expiresAt)) {
      await authRepository.deleteRefreshTokenById(storedId);
      throw new AppError(
        "TOKEN_EXPIRED",
        "Refresh token has expired. Please sign in again.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      await authRepository.deleteRefreshTokenById(storedId);
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", HTTP_STATUS.UNAUTHORIZED);
    }

    const rawNewRefreshToken = generateOpaqueToken();
    const newTokenHash = hashToken(rawNewRefreshToken);
    const refreshTokenTtlMs = parseDurationMs(env.JWT_REFRESH_TTL);

    await authRepository.revokeRefreshTokenById(storedId, newTokenHash);
    await authRepository.createRefreshToken({
      userId,
      tokenHash: newTokenHash,
      familyId,
      expiresAt: addMilliseconds(new Date(), refreshTokenTtlMs),
    });

    const accessToken = generateToken({ sub: user.id, role: user.role }, TokenTypeEnum.ACCESS);

    auditLog("success", "Refresh succeeded", {
      event: "refresh.success",
      userId: user.id,
      ip: remoteIp,
    });

    return {
      accessToken,
      refreshToken: rawNewRefreshToken,
      refreshTokenTtlSeconds: Math.floor(refreshTokenTtlMs / MS_PER_SECOND),
    };
  },

  async validateSession(
    rawRefreshToken: string | undefined,
  ): Promise<{ accessToken: string; user: AuthUser | BrandAuthUser }> {
    if (!rawRefreshToken) {
      throw new AppError("MISSING_TOKEN", "No refresh token provided.", HTTP_STATUS.UNAUTHORIZED);
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!stored || stored.revokedAt) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", HTTP_STATUS.UNAUTHORIZED);
    }

    if (isPast(stored.expiresAt)) {
      throw new AppError(
        "TOKEN_EXPIRED",
        "Refresh token has expired. Please sign in again.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const userExists = await userRepository.findById(stored.userId);
    if (!userExists) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await authSessionService.getCurrentUser(stored.userId);

    return {
      accessToken: generateToken({ sub: user.id, role: user.role }, TokenTypeEnum.ACCESS),
      user,
    };
  },

  async logout(rawRefreshToken: string | undefined, remoteIp?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHashValue = hashToken(rawRefreshToken);
    const stored = await authRepository.findRefreshTokenByHash(tokenHashValue);

    await authRepository.deleteRefreshTokenByHash(tokenHashValue);

    auditLog("success", "Logout: refresh token invalidated", {
      event: "logout.success",
      userId: stored?.userId,
      ip: remoteIp,
    });
  },

  async getCurrentUser(userId: string): Promise<AuthUser | BrandAuthUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", USER_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
    }

    const { id, name, email, phone, role } = user;
    const hasCrmAccess = await crmAccessService.resolveHasCrmAccess(id);

    if (role === UserRole.BRAND_OWNER) {
      const membership = await authRepository.findBrandMembershipByUserId(id);
      if (membership) {
        return {
          id,
          name,
          email,
          phone,
          avatarUrl: membership.brandAvatarUrl,
          role,
          brandId: membership.brandId,
          ...(await resolvePlatformFields(id, role)),
          hasCrmAccess,
        };
      }

      logger.warn(`Brand owner ${id} has no brand membership — returning degraded profile.`);
    }

    const authUser = { ...toAuthUser(user), hasCrmAccess };
    if (!isStaffUserRole(role)) return authUser;

    return {
      ...authUser,
      ...(await resolvePlatformFields(id, role)),
    };
  },
};
