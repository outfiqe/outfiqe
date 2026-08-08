import "dotenv/config";
import { z } from "zod";

import logger from "#lib/winston.utils.js";

const JWT_SECRET_MIN_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(JWT_SECRET_MIN_LENGTH, `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters`),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  // Gmail SMTP sender. GMAIL_APP_PASSWORD is optional — without it,
  // sendEmail() falls back to the console stub (shared/utils/email.utils.ts).
  // Generate one at https://myaccount.google.com/apppasswords (needs 2FA on).
  GMAIL_USER: z.email().default("anjesh67890@gmail.com"),
  GMAIL_APP_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(`Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error))}`);
  process.exit(1);
}

export const env = parsed.data;
