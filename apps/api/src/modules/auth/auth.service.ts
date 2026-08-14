import jwt from "jsonwebtoken";

import { env } from "#config/env.config.js";
import { TokenPurpose, TokenTypeEnum } from "#constants/enums/auth.enum.js";
import { passwordResetTemplate, verifyEmailTemplate } from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { parseDurationMs } from "#lib/duration.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword, verifyPassword } from "#lib/password.utils.js";
import { signPurposeToken, verifyPurposeToken } from "#lib/purpose-token.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { adminInviteRepository } from "#modules/admin-invites/adminInvite.repository.js";
import { userRepository } from "#modules/users/user.repository.js";
import type { UserRecord } from "#modules/users/user.types.js";
import type { PurposeTokenPayload } from "#types/token.types.js";

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

const PURPOSE_ERROR_COPY: Record<TokenPurpose, { invalid: string; expired: string }> = {
  [TokenPurpose.EMAIL_VERIFICATION]: {
    invalid: "This verification link is invalid or has expired.",
    expired: "This verification link has expired. Please request a new one.",
  },
  [TokenPurpose.PASSWORD_RESET]: {
    invalid: "This reset link is invalid or has expired.",
    expired: "This reset link has expired. Please request a new one.",
  },
};

const verifyPurposeTokenOrThrow = (token: string, purpose: TokenPurpose): PurposeTokenPayload => {
  const copy = PURPOSE_ERROR_COPY[purpose];

  let payload: PurposeTokenPayload;
  try {
    payload = verifyPurposeToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError("TOKEN_EXPIRED", copy.expired, BAD_REQUEST_STATUS);
    }
    throw new AppError("INVALID_TOKEN", copy.invalid, BAD_REQUEST_STATUS);
  }

  if (payload.purpose !== purpose) {
    throw new AppError("INVALID_TOKEN", copy.invalid, BAD_REQUEST_STATUS);
  }

  return payload;
};

const issueTokens = async (user: Pick<UserRecord, "id" | "role">): Promise<IssuedTokens> => {
  const accessToken = generateToken({ sub: user.id, role: user.role }, TokenTypeEnum.ACCESS);

  const rawRefreshToken = generateOpaqueToken();
  const refreshTokenTtlMs = parseDurationMs(env.JWT_REFRESH_TTL);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: new Date(Date.now() + refreshTokenTtlMs),
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

export const authService = {
  async register(input: RegisterInput): Promise<{ userId: string }> {
    const { name, email, phone, password } = input;

    const existingByEmail = await userRepository.findByEmail(email);
    if (existingByEmail) {
      logger.warn(`Register failed: email already exists (${email})`);
      throw new AppError(
        "USER_EXISTS",
        "An account with this email already exists.",
        CONFLICT_STATUS,
      );
    }

    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) {
      logger.warn(`Register failed: phone already exists (${phone})`);
      throw new AppError(
        "PHONE_EXISTS",
        "An account with this phone number already exists.",
        CONFLICT_STATUS,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ name, email, phone, password, passwordHash });

    await sendVerificationEmail(user);

    eventBus.emit(DomainEvents.USER_CREATED, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User registered: ${user.id}`);

    return { userId: user.id };
  },

  async verifyEmail(token: string): Promise<void> {
    const payload = verifyPurposeTokenOrThrow(token, TokenPurpose.EMAIL_VERIFICATION);

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", USER_NOT_FOUND_MESSAGE, NOT_FOUND_STATUS);
    }

    if (user.emailVerified) {
      logger.info(`Email already verified for user ${user.id}`);
      return;
    }

    await userRepository.markEmailVerified(user.id);
    eventBus.emit(DomainEvents.USER_EMAIL_VERIFIED, { userId: user.id, email: user.email });

    logger.info(`Email verified for user ${user.id}`);
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
    verifyPurposeTokenOrThrow(token, purpose);
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const user = await userRepository.findByEmail(email);
    const isValid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !isValid) {
      logger.warn(`Login failed: invalid credentials for ${email}`);
      throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, UNAUTHORIZED_STATUS);
    }

    if (!user.emailVerified) {
      logger.warn(`Login blocked: email not verified for user ${user.id}`);
      throw new AppError(
        "EMAIL_NOT_VERIFIED",
        "Please verify your email before signing in.",
        FORBIDDEN_STATUS,
      );
    }

    const tokens = await issueTokens(user);

    logger.info(`Login succeeded for user ${user.id}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isCreator: user.isCreator,
        creatorStatus: user.creatorStatus,
      },
    };
  },

  async refresh(rawRefreshToken: string | undefined): Promise<IssuedTokens> {
    if (!rawRefreshToken) {
      throw new AppError("MISSING_TOKEN", "No refresh token provided.", UNAUTHORIZED_STATUS);
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!stored) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      await authRepository.deleteRefreshTokenById(stored.id);
      throw new AppError(
        "TOKEN_EXPIRED",
        "Refresh token has expired. Please sign in again.",
        UNAUTHORIZED_STATUS,
      );
    }

    const user = await userRepository.findById(stored.userId);

    // Rotation: the presented token is single-use regardless of outcome below.
    await authRepository.deleteRefreshTokenById(stored.id);

    if (!user) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
    }

    const tokens = await issueTokens(user);

    logger.info(`Refresh succeeded for user ${user.id}`);

    return tokens;
  },

  // Non-rotating counterpart to refresh(): used by server-side session checks
  // (SSR pages) that call this on every render and can't propagate a Set-Cookie
  // back to the browser. Rotating there would burn the browser's refresh token
  // on its first server-side use, logging the user out on the very next check.
  async validateSession(rawRefreshToken: string | undefined): Promise<{ accessToken: string }> {
    if (!rawRefreshToken) {
      throw new AppError("MISSING_TOKEN", "No refresh token provided.", UNAUTHORIZED_STATUS);
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
    if (!stored) {
      throw new AppError("INVALID_TOKEN", "Refresh token is invalid.", UNAUTHORIZED_STATUS);
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
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

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    await authRepository.deleteRefreshTokenByHash(hashToken(rawRefreshToken));

    logger.info("Logout: refresh token invalidated");
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      logger.info(`Password reset requested for unregistered email (${email})`);
      return;
    }

    const resetToken = signPurposeToken(
      { sub: user.id, purpose: TokenPurpose.PASSWORD_RESET },
      PASSWORD_RESET_TTL,
    );
    const url = `${PASSWORD_RESET_URL}?token=${resetToken}`;
    const { subject, html } = passwordResetTemplate(url);

    await sendEmail({
      to: user.email,
      subject,
      body: `Reset your password: ${url}`,
      html,
    });

    logger.info(`Password reset email sent to user ${user.id}`);
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const payload = verifyPurposeTokenOrThrow(token, TokenPurpose.PASSWORD_RESET);

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", USER_NOT_FOUND_MESSAGE, NOT_FOUND_STATUS);
    }

    const passwordHash = await hashPassword(password);
    await userRepository.updatePasswordHash(user.id, passwordHash);
    await authRepository.deleteAllRefreshTokensForUser(user.id);

    eventBus.emit(DomainEvents.USER_PASSWORD_RESET, { userId: user.id });

    logger.info(`Password reset for user ${user.id}`);
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

    if (user.role === UserRole.BRAND_OWNER) {
      const membership = await authRepository.findBrandMembershipByUserId(user.id);
      if (membership) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: membership.brandAvatarUrl,
          role: user.role,
          brandId: membership.brandId,
        };
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isCreator: user.isCreator,
      creatorStatus: user.creatorStatus,
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

    const existingByEmail = await userRepository.findByEmail(invite.email);
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
      name,
      email: invite.email,
      phone,
      password,
      passwordHash,
      role: UserRole.BRAND_OWNER,
      emailVerified: true,
    });

    await authRepository.createBrandMembership({
      userId: user.id,
      brandId: invite.brandId,
      role: BrandRole.OWNER,
    });
    await authRepository.markBrandInviteAccepted(invite.id);

    eventBus.emit(DomainEvents.BRAND_OWNER_REGISTERED, {
      userId: user.id,
      brandId: invite.brandId,
      email: user.email,
    });

    const tokens = await issueTokens(user);

    logger.info(`Brand owner registered: ${user.id} for brand ${invite.brandId}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: invite.brand.avatarUrl,
        role: user.role,
        brandId: invite.brandId,
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

    const existingByEmail = await userRepository.findByEmail(invite.email);
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
      name: invite.name,
      email: invite.email,
      phone,
      password,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    });

    await adminInviteRepository.markAccepted(invite.id);

    eventBus.emit(DomainEvents.ADMIN_REGISTERED, { userId: user.id, email: user.email });

    const tokens = await issueTokens(user);

    logger.info(`Admin registered: ${user.id}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isCreator: user.isCreator,
        creatorStatus: user.creatorStatus,
      },
    };
  },
};
