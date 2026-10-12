import { env } from "#config/env.config.js";
import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { passwordResetTemplate } from "#email-templates/account.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { sendEmail } from "#lib/email.utils.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword, verifyPassword } from "#lib/password.utils.js";
import { isPasswordBreached } from "#lib/password-breach.utils.js";
import { signPurposeToken } from "#lib/purpose-token.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { auditLog } from "../auth.audit.js";
import {
  PASSWORD_BREACHED_MESSAGE,
  PURPOSE_ERROR_COPY,
  USER_NOT_FOUND_MESSAGE,
} from "../auth.constants.js";
import { authRepository } from "../auth.repository.js";
import { redeemPurposeTokenOrThrow, verifyPurposeTokenOrThrow } from "../auth.tokens.js";

const PASSWORD_RESET_TTL = "1h";

const PASSWORD_RESET_URL = `${env.FRONTEND_URL}/reset-password`;

export const authPasswordService = {
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
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (await isPasswordBreached(password)) {
      throw new AppError("PASSWORD_BREACHED", PASSWORD_BREACHED_MESSAGE, HTTP_STATUS.BAD_REQUEST);
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

  async changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    currentRefreshToken: string | undefined;
    remoteIp?: string;
  }): Promise<void> {
    const { userId, currentPassword, newPassword, currentRefreshToken, remoteIp } = input;

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", USER_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
    }

    if (!user.passwordHash) {
      throw new AppError(
        "NO_PASSWORD_SET",
        "Your account signs in with a connected account. Use the 'Forgot password' link to set a password first.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      auditLog("failure", "Password change failed: current password incorrect", {
        event: "change_password.invalid_current_password",
        userId,
        email: user.email,
        ip: remoteIp,
      });
      throw new AppError(
        "INVALID_CURRENT_PASSWORD",
        "Your current password is incorrect.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (newPassword === currentPassword) {
      throw new AppError(
        "PASSWORD_UNCHANGED",
        "Your new password must be different from your current password.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (await isPasswordBreached(newPassword)) {
      throw new AppError("PASSWORD_BREACHED", PASSWORD_BREACHED_MESSAGE, HTTP_STATUS.BAD_REQUEST);
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePasswordHash(userId, passwordHash);

    if (currentRefreshToken) {
      await authRepository.deleteRefreshTokensForUserExcept(userId, hashToken(currentRefreshToken));
    } else {
      await authRepository.deleteAllRefreshTokensForUser(userId);
    }

    await eventBus.publish(DomainEvents.USER_PASSWORD_RESET, { userId });

    auditLog("success", "Password changed; other sessions revoked", {
      event: "change_password.success",
      userId,
      email: user.email,
      ip: remoteIp,
    });
  },
};
