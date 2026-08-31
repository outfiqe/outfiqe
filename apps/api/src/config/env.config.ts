import "./load-env.js";

import { z } from "zod";

import logger from "#lib/winston.utils.js";

const JWT_SECRET_MIN_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_ENV: z.enum(["local", "dev", "prod"]),
  PROCESS_ROLE: z.enum(["all", "api", "worker", "scheduler"]),
  PORT: z.coerce.number(),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive(),
  JWT_SECRET: z
    .string()
    .min(JWT_SECRET_MIN_LENGTH, `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters`),
  JWT_ACCESS_TTL: z.string().min(1),
  JWT_REFRESH_TTL: z.string().min(1),
  GMAIL_USER: z.email(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  FRONTEND_URL: z.url(),
  ADMIN_URL: z.url(),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  ADMIN_BOOTSTRAP_EMAIL: z.email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(1).optional(),
  ADMIN_BOOTSTRAP_PHONE: z.string().min(1).optional(),
  STORAGE_DRIVER: z.enum(["local"]),
  UPLOADS_DIR: z.string().min(1),
  API_PUBLIC_URL: z.url(),
  TENANT_BASE_DOMAIN: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ESEWA_PRODUCT_CODE: z.string().min(1),
  ESEWA_SECRET_KEY: z.string().min(1),
  ESEWA_BASE_URL: z.url(),
  ESEWA_STATUS_URL: z.url(),
  KHALTI_BASE_URL: z.url(),
  KHALTI_SECRET_KEY: z.string().min(1),
  PASSWORD_BREACH_CHECK_ENABLED: z.stringbool(),
  CAPTCHA_ENABLED: z.stringbool(),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  OAUTH_REDIRECT_BASE_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  FACEBOOK_APP_ID: z.string().min(1),
  FACEBOOK_APP_SECRET: z.string().min(1),
  BANK_ACCOUNT_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "BANK_ACCOUNT_ENCRYPTION_KEY must be exactly 64 hex characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(`Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error))}`);
  process.exit(1);
}

export const env = parsed.data;
