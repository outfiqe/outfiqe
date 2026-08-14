import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { hashPassword } from "#lib/password.utils.js";
import { phoneSchema } from "#lib/phone.utils.js";
import logger from "#lib/winston.utils.js";
import { userRepository } from "#modules/users/user.repository.js";

export const bootstrapAdminIfNeeded = async (): Promise<void> => {
  const { ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD, ADMIN_BOOTSTRAP_PHONE } = env;

  if (!ADMIN_BOOTSTRAP_EMAIL && !ADMIN_BOOTSTRAP_PASSWORD && !ADMIN_BOOTSTRAP_PHONE) return;

  if (!ADMIN_BOOTSTRAP_EMAIL || !ADMIN_BOOTSTRAP_PASSWORD || !ADMIN_BOOTSTRAP_PHONE) {
    logger.warn(
      "Admin bootstrap skipped: ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD and " +
        "ADMIN_BOOTSTRAP_PHONE must all be set together.",
    );
    return;
  }

  const phoneResult = phoneSchema.safeParse(ADMIN_BOOTSTRAP_PHONE);
  if (!phoneResult.success) {
    logger.warn(`Admin bootstrap skipped: ADMIN_BOOTSTRAP_PHONE is not a valid phone number.`);
    return;
  }

  try {
    const existingAdminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
    if (existingAdminCount > 0) return;

    const [existingByEmail, existingByPhone] = await Promise.all([
      userRepository.findByEmail(ADMIN_BOOTSTRAP_EMAIL),
      userRepository.findByPhone(phoneResult.data),
    ]);

    if (existingByEmail || existingByPhone) {
      logger.error(
        "Admin bootstrap skipped: ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PHONE is already " +
          "in use by an existing account.",
      );
      return;
    }

    const passwordHash = await hashPassword(ADMIN_BOOTSTRAP_PASSWORD);
    const admin = await userRepository.create({
      email: ADMIN_BOOTSTRAP_EMAIL,
      name: "Admin",
      phone: phoneResult.data,
      password: ADMIN_BOOTSTRAP_PASSWORD,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    });

    logger.warn(
      `Bootstrap admin created (${admin.email}). Rotate ADMIN_BOOTSTRAP_PASSWORD or invite a ` +
        "replacement admin and remove these env vars once done.",
    );
  } catch (err) {
    logger.error(`Admin bootstrap failed: ${String(err)}`);
  }
};
