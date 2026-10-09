import { env } from "#config/env.config.js";
import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { verifyEmailTemplate } from "#email-templates/account.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { sendEmail } from "#lib/email.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { isPasswordBreached } from "#lib/password-breach.utils.js";
import { signPurposeToken } from "#lib/purpose-token.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";
import type { UserRecord } from "#modules/users/user.types.js";

import { auditLog } from "../auth.audit.js";
import { verifyCaptcha } from "../auth.captcha.utils.js";
import {
  CAPTCHA_FAILED_MESSAGE,
  PASSWORD_BREACHED_MESSAGE,
  PURPOSE_ERROR_COPY,
} from "../auth.constants.js";
import { redeemPurposeTokenOrThrow, verifyPurposeTokenOrThrow } from "../auth.tokens.js";
import type { RegisterInput } from "../auth.types.js";

const EMAIL_VERIFICATION_TTL = "24h";

const EMAIL_VERIFICATION_URL = `${env.FRONTEND_URL}/verify-email`;

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

export const authRegistrationService = {
  async register(input: RegisterInput): Promise<{ userId: string }> {
    const { name, email, phone, password, captchaToken, remoteIp } = input;

    if (!(await verifyCaptcha(captchaToken, remoteIp))) {
      auditLog("failure", "Register blocked: captcha challenge failed", {
        event: "register.captcha_failed",
        email,
        ip: remoteIp,
      });
      throw new AppError("CAPTCHA_FAILED", CAPTCHA_FAILED_MESSAGE, HTTP_STATUS.BAD_REQUEST);
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
        HTTP_STATUS.CONFLICT,
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
        HTTP_STATUS.CONFLICT,
      );
    }

    if (await isPasswordBreached(password)) {
      throw new AppError("PASSWORD_BREACHED", PASSWORD_BREACHED_MESSAGE, HTTP_STATUS.BAD_REQUEST);
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
        HTTP_STATUS.BAD_REQUEST,
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
};
