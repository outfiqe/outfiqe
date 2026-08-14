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
  //TODO: ADD real smtp server when MVP is finished
  GMAIL_USER: z.email().default("anjesh67890@gmail.com"),
  GMAIL_APP_PASSWORD: z.string().optional(),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
  ADMIN_URL: z.url().default("http://localhost:5173"),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  ADMIN_BOOTSTRAP_EMAIL: z.email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(1).optional(),
  ADMIN_BOOTSTRAP_PHONE: z.string().min(1).optional(),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  UPLOADS_DIR: z.string().default("uploads"),
  API_PUBLIC_URL: z.url().default("http://localhost:4000"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(`Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error))}`);
  process.exit(1);
}

export const env = parsed.data;
