import { randomUUID } from "node:crypto";

import { addMilliseconds } from "date-fns/addMilliseconds";
import { fromUnixTime } from "date-fns/fromUnixTime";
import { getUnixTime } from "date-fns/getUnixTime";
import { isPast } from "date-fns/isPast";
import jwt from "jsonwebtoken";

import { env } from "#config/env.config.js";
import { TokenPurpose, TokenTypeEnum } from "#constants/enums/auth.enum.js";
import { prisma } from "#db/prisma.js";
import { passwordResetTemplate, verifyEmailTemplate } from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { parseDurationMs } from "#lib/duration.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword, needsRehash, verifyPassword } from "#lib/password.utils.js";
import { isPasswordBreached } from "#lib/password-breach.utils.js";
import { signPurposeToken, verifyPurposeToken } from "#lib/purpose-token.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { adminInviteRepository } from "#modules/admin-invites/adminInvite.repository.js";
import { userRepository } from "#modules/users/user.repository.js";
import type { UserRecord } from "#modules/users/user.types.js";
import { describeError } from "#redis/redis.utils.js";
import type { DbClient } from "#types/db.types.js";
import type { PurposeTokenPayload } from "#types/token.types.js";

import { verifyCaptcha } from "./auth.captcha.utils.js";
import { LOGIN_CAPTCHA_CHALLENGE_THRESHOLD, PURPOSE_ERROR_COPY } from "./auth.constants.js";
import {
  getFailedLoginCount,
  isLockedOut,
  recordFailedLogin,
  resetFailedLogins,
} from "./auth.lockout.utils.js";
import { authRepository } from "./auth.repository.js";
import type {
  AdminInviteInfo,
  AuthSession,
  AuthUser,
  BrandAuthSession,
  BrandAuthUser,
  BrandInviteInfo,
  IssuedTokens,
  RegisterAdminInput,
  RegisterBrandInput,
  RegisterInput,
} from "./auth.types.js";

const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const MS_PER_SECOND = 1000;

const EMAIL_VERIFICATION_TTL = "24h";
const PASSWORD_RESET_TTL = "1h";
const EMAIL_VERIFICATION_URL = `${env.FRONTEND_URL}/verify-email`;
const PASSWORD_RESET_URL = `${env.FRONTEND_URL}/reset-password`;

const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";
const USER_NOT_FOUND_MESSAGE = "User not found.";
const PASSWORD_BREACHED_MESSAGE =
  "This password has appeared in a data breach. Please choose another.";
const CAPTCHA_FAILED_MESSAGE = "Please complete the challenge to continue.";

const verifyPurposeTokenOrThrow = async (
  token: string,
  purpose: TokenPurpose,
): Promise<PurposeTokenPayload> => {
  const copy = PURPOSE_ERROR_COPY[purpose];

  let tokenPayload: PurposeTokenPayload;
  try {
    tokenPayload = verifyPurposeToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError("TOKEN_EXPIRED", copy.expired, BAD_REQUEST_STATUS);
    }
    throw new AppError("INVALID_TOKEN", copy.invalid, BAD_REQUEST_STATUS);
  }

  if (tokenPayload.purpose !== purpose) {
    throw new AppError("INVALID_TOKEN", copy.invalid, BAD_REQUEST_STATUS);
  }

  const alreadyUsed = await authRepository.findUsedPurposeToken(tokenPayload.jti);
  if (alreadyUsed) {
    throw new AppError("INVALID_TOKEN", copy.invalid, BAD_REQUEST_STATUS);
  }

  return tokenPayload;
};

const purposeTokenExpiry = (tokenPayload: PurposeTokenPayload): Date =>
  fromUnixTime(tokenPayload.exp ?? getUnixTime(new Date()));

const isUniqueConstraintViolation = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "P2002";

const redeemPurposeTokenOrThrow = async (
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
      throw new AppError("INVALID_TOKEN", PURPOSE_ERROR_COPY[purpose].invalid, BAD_REQUEST_STATUS);
    }
    throw err;
  }
};

const issueTokens = async (
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

const sendVerificationEmail = async (user: Pick<UserRecord, "id" | "email">): Promise<void> => {
  const verificationToken = signPurposeToken(
    { sub: user.id, purpose: TokenPurpose.EMAIL_VERIFICATION },
    EMAIL_VERIFICATION_TTL,
  );
  const url = `${EMAIL_VERIFICATION_URL}?token=${verificationToken}`;
  const { subject, html } = verifyEmailTemplate(url);

  await sendEmail({
    to: user.email,
    subject,
    body: `Welcome to Outfiqe! Verify your email: ${url}`,
    html,
  });
};

type AuthAuditOutcome = "success" | "failure";

const auditLog = (
  outcome: AuthAuditOutcome,
  message: string,
  fields: { event: string; userId?: string; email?: string; ip?: string },
): void => {
  const level = outcome === "success" ? "info" : "warn";
  logger[level](message, { ...fields, outcome });
};

const rehashPasswordInBackground = (userId: string, plaintextPassword: string): void => {
  hashPassword(plaintextPassword)
    .then((newPasswordHash) => userRepository.updatePasswordHash(userId, newPasswordHash))
    .catch((err: unknown) => {
      logger.error(`Password rehash failed for user ${userId}: ${describeError(err)}`);
    });
};

export const authService = {
  async register(input: RegisterInput): Promise<{ userId: string }> {
    const { name, email, phone, password, captchaToken, remoteIp } = input;

    if (!(await verifyCaptcha(captchaToken, remoteIp))) {
      auditLog("failure", "Register blocked: captcha challenge failed", {
        event: "register.captcha_failed",
        email,
        ip: remoteIp,
      });
      throw new AppError("CAPTCHA_FAILED", CAPTCHA_FAILED_MESSAGE, BAD_REQUEST_STATUS);
    }

    const existingByEmail = await userRepository.findByEmail(email);
    if (existingByEmail) {
      auditLog("failure", "Register failed: email already exists", {
        event: "register.email_exists",
        email,
        ip: remoteIp,
      });
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        CONFLICT_STATUS,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      auditLog("failure", "Register failed: phone already exists", {
        event: "register.phone_exists",
        email,
        ip: remoteIp,
      });
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        CONFLICT_STATUS,
      );
    }

    if (await isPasswordBreached(password)) {
      throw new AppError("PASSWORD_BREACHED", PASSWORD_BREACHED_MESSAGE, BAD_REQUEST_STATUS);
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ name, email, phone, password, passwordHash });

    await sendVerificationEmail(user);

    const { id, email: userEmail, role } = user;

    await eventBus.publish(DomainEvents.USER_CREATED, {
      userId: id,
      email: userEmail,
      role,
    });

    auditLog("success", "User registered", {
      event: "register.success",
      userId: id,
      email: userEmail,
      ip: remoteIp,
    });

    return { userId: id };
  },

  async verifyEmail(token: string): Promise<void> {
    const tokenPayload = await verifyPurposeTokenOrThrow(token, TokenPurpose.EMAIL_VERIFICATION);

    const user = await userRepository.findById(tokenPayload.sub);
    if (!user) {
      throw new AppError(
        "INVALID_TOKEN",
        PURPOSE_ERROR_COPY[TokenPurpose.EMAIL_VERIFICATION].invalid,
        BAD_REQUEST_STATUS,
      );
    }

    const { id, email, emailVerified } = user;

    if (emailVerified) {
      logger.info(`Email already verified for user ${id}`);
      return;
    }

    await redeemPurposeTokenOrThrow(tokenPayload, TokenPurpose.EMAIL_VERIFICATION, (tx) =>
      userRepository.markEmailVerified(id, tx),
    );

    await eventBus.publish(DomainEvents.USER_EMAIL_VERIFIED, { userId: id, email });

    logger.info(`Email verified for user ${id}`);
  },

  async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user || user.emailVerified) {
      logger.info(`Resend verification requested for ${email} (no-op)`);
      return;
    }

    await sendVerificationEmail(user);
    logger.info(`Verification email re-sent to user ${user.id}`);
  },

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
      throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, UNAUTHORIZED_STATUS);
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
      throw new AppError("CAPTCHA_FAILED", CAPTCHA_FAILED_MESSAGE, BAD_REQUEST_STATUS);
    }

    const user = await userRepository.findByEmail(email);
    const isValid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !isValid) {
      await recordFailedLogin(email);
      auditLog("failure", "Login failed: invalid credentials", {
        event: "login.invalid_credentials",
        email,
        ip: remoteIp,
      });
      throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, UNAUTHORIZED_STATUS);
    }

    await resetFailedLogins(email);

    const { id, name, handle, avatarUrl, role, isCreator, creatorStatus } = user;

    if (needsRehash(user.passwordHash)) {
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
        FORBIDDEN_STATUS,
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
        id,
        name,
        handle,
        email: user.email,
        avatarUrl,
        role,
        isCreator,
        creatorStatus,
      },
    };
  },

  async refresh(rawRefreshToken: string | undefined, remoteIp?: string): Promise<IssuedTokens> {
    if (!rawRefreshToken) {
      throw new AppError("MISSING_TOKEN", "No refresh token provided.", UNAUTHORIZED_STATUS);
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!stored) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
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
        UNAUTHORIZED_STATUS,
      );
    }

    if (isPast(expiresAt)) {
      await authRepository.deleteRefreshTokenById(storedId);
      throw new AppError(
        "TOKEN_EXPIRED",
        "Refresh token has expired. Please sign in again.",
        UNAUTHORIZED_STATUS,
      );
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      await authRepository.deleteRefreshTokenById(storedId);
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
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

  async validateSession(rawRefreshToken: string | undefined): Promise<{ accessToken: string }> {
    if (!rawRefreshToken) {
      throw new AppError("MISSING_TOKEN", "No refresh token provided.", UNAUTHORIZED_STATUS);
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!stored || stored.revokedAt) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
    }

    if (isPast(stored.expiresAt)) {
      throw new AppError(
        "TOKEN_EXPIRED",
        "Refresh token has expired. Please sign in again.",
        UNAUTHORIZED_STATUS,
      );
    }

    const user = await userRepository.findById(stored.userId);
    if (!user) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
    }

    return { accessToken: generateToken({ sub: user.id, role: user.role }, TokenTypeEnum.ACCESS) };
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

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      logger.info(`Password reset requested for unregistered email (${email})`);
      return;
    }

    const { id, email: userEmail } = user;

    const resetToken = signPurposeToken(
      { sub: id, purpose: TokenPurpose.PASSWORD_RESET },
      PASSWORD_RESET_TTL,
    );
    const url = `${PASSWORD_RESET_URL}?token=${resetToken}`;
    const { subject, html } = passwordResetTemplate(url);

    await sendEmail({
      to: userEmail,
      subject,
      body: `Reset your password: ${url}`,
      html,
    });

    logger.info(`Password reset email sent to user ${id}`);
  },

  async resetPassword(token: string, password: string, remoteIp?: string): Promise<void> {
    const tokenPayload = await verifyPurposeTokenOrThrow(token, TokenPurpose.PASSWORD_RESET);

    const user = await userRepository.findById(tokenPayload.sub);
    if (!user) {
      throw new AppError(
        "INVALID_TOKEN",
        PURPOSE_ERROR_COPY[TokenPurpose.PASSWORD_RESET].invalid,
        BAD_REQUEST_STATUS,
      );
    }

    if (await isPasswordBreached(password)) {
      throw new AppError("PASSWORD_BREACHED", PASSWORD_BREACHED_MESSAGE, BAD_REQUEST_STATUS);
    }

    const passwordHash = await hashPassword(password);
    await redeemPurposeTokenOrThrow(tokenPayload, TokenPurpose.PASSWORD_RESET, (tx) =>
      userRepository.updatePasswordHash(user.id, passwordHash, tx),
    );
    await authRepository.deleteAllRefreshTokensForUser(user.id);

    await eventBus.publish(DomainEvents.USER_PASSWORD_RESET, { userId: user.id });

    auditLog("success", "Password reset succeeded; all sessions revoked", {
      event: "reset_password.success",
      userId: user.id,
      ip: remoteIp,
    });
  },

  async getBrandInvite(inviteToken: string): Promise<BrandInviteInfo> {
    const invite = await authRepository.findBrandInviteByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError("INVALID_INVITE", "This invite link is not valid.", BAD_REQUEST_STATUS);
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        BAD_REQUEST_STATUS,
      );
    }

    if (invite.acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        BAD_REQUEST_STATUS,
      );
    }

    return { email: invite.email, brandName: invite.brand.name };
  },

  async getCurrentUser(userId: string): Promise<AuthUser | BrandAuthUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", USER_NOT_FOUND_MESSAGE, NOT_FOUND_STATUS);
    }

    const { id, name, handle, email, role, avatarUrl, isCreator, creatorStatus } = user;

    if (role === UserRole.BRAND_OWNER) {
      const membership = await authRepository.findBrandMembershipByUserId(id);
      if (membership) {
        return {
          id,
          name,
          email,
          avatarUrl: membership.brandAvatarUrl,
          role,
          brandId: membership.brandId,
        };
      }

      logger.warn(`Brand owner ${id} has no brand membership — returning degraded profile.`);
    }

    return {
      id,
      name,
      handle,
      email,
      avatarUrl,
      role,
      isCreator,
      creatorStatus,
    };
  },

  async registerBrand(input: RegisterBrandInput): Promise<BrandAuthSession> {
    const { inviteToken, name, phone, password } = input;

    const invite = await authRepository.findBrandInviteByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError(
        "INVALID_INVITE",
        "This invite link is not valid or has already been used.",
        BAD_REQUEST_STATUS,
      );
    }

    const { expiresAt, acceptedAt, email: inviteEmail, brandId, id: inviteId, brand } = invite;

    if (expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        BAD_REQUEST_STATUS,
      );
    }

    if (acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        BAD_REQUEST_STATUS,
      );
    }

    const existingByEmail = await userRepository.findByEmail(inviteEmail);
    if (existingByEmail) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        CONFLICT_STATUS,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        CONFLICT_STATUS,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await userRepository.create(
        {
          name,
          email: inviteEmail,
          phone,
          password,
          passwordHash,
          role: UserRole.BRAND_OWNER,
          emailVerified: true,
        },
        tx,
      );

      await authRepository.createBrandMembership(
        {
          userId: createdUser.id,
          brandId,
          role: BrandRole.OWNER,
        },
        tx,
      );
      await authRepository.markBrandInviteAccepted(inviteId, tx);

      return createdUser;
    });

    await eventBus.publish(DomainEvents.BRAND_OWNER_REGISTERED, {
      userId: user.id,
      brandId,
      email: user.email,
    });

    const tokens = await issueTokens(user);

    logger.info(`Brand owner registered: ${user.id} for brand ${brandId}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: brand.avatarUrl,
        role: user.role,
        brandId,
      },
    };
  },

  async getAdminInvite(inviteToken: string): Promise<AdminInviteInfo> {
    const invite = await adminInviteRepository.findByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError("INVALID_INVITE", "This invite link is not valid.", BAD_REQUEST_STATUS);
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        BAD_REQUEST_STATUS,
      );
    }

    if (invite.acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        BAD_REQUEST_STATUS,
      );
    }

    return { email: invite.email, name: invite.name };
  },

  async registerAdmin(input: RegisterAdminInput): Promise<AuthSession> {
    const { inviteToken, phone, password } = input;

    const invite = await adminInviteRepository.findByTokenHash(hashToken(inviteToken));
    if (!invite) {
      throw new AppError(
        "INVALID_INVITE",
        "This invite link is not valid or has already been used.",
        BAD_REQUEST_STATUS,
      );
    }

    const { expiresAt, acceptedAt, email: inviteEmail, name: inviteName, id: inviteId } = invite;

    if (expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_EXPIRED",
        "This invite link has expired. Please contact us for a new one.",
        BAD_REQUEST_STATUS,
      );
    }

    if (acceptedAt) {
      throw new AppError(
        "INVITE_USED",
        "This invite link has already been used.",
        BAD_REQUEST_STATUS,
      );
    }

    const existingByEmail = await userRepository.findByEmail(inviteEmail);
    if (existingByEmail) {
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        CONFLICT_STATUS,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        CONFLICT_STATUS,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      name: inviteName,
      email: inviteEmail,
      phone,
      password,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    });

    await adminInviteRepository.markAccepted(inviteId);

    await eventBus.publish(DomainEvents.ADMIN_REGISTERED, { userId: user.id, email: user.email });

    const tokens = await issueTokens(user);

    logger.info(`Admin registered: ${user.id}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isCreator: user.isCreator,
        creatorStatus: user.creatorStatus,
      },
    };
  },
};
