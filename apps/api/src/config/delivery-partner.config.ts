import "./load-env.js";

import { z } from "zod";

const ENV_PREFIX = "DELIVERY_PARTNER";
const MIN_SECRET_LENGTH = 16;

const SECRET_SUFFIX = {
  API_KEY: "API_KEY",
  BASE_URL: "BASE_URL",
  WEBHOOK_SECRET: "WEBHOOK_SECRET",
  PREVIOUS_WEBHOOK_SECRET: "WEBHOOK_SECRET_PREVIOUS",
} as const;

type SecretSuffix = (typeof SECRET_SUFFIX)[keyof typeof SECRET_SUFFIX];

const secretSchema = z.string().trim().min(MIN_SECRET_LENGTH);
const baseUrlSchema = z.url();

export type DeliveryPartnerCredentials = {
  apiKey: string | null;
  baseUrl: string | null;
  webhookSecret: string | null;
  previousWebhookSecret: string | null;
};

const readEnvValue = (credentialsKey: string, suffix: SecretSuffix): string | undefined =>
  process.env[`${ENV_PREFIX}_${credentialsKey}_${suffix}`];

const readValid = (value: string | undefined, schema: z.ZodType<string>): string | null => {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const readDeliveryPartnerCredentials = (
  credentialsKey: string | null,
): DeliveryPartnerCredentials => {
  if (credentialsKey === null) {
    return { apiKey: null, baseUrl: null, webhookSecret: null, previousWebhookSecret: null };
  }
  return {
    apiKey: readValid(readEnvValue(credentialsKey, SECRET_SUFFIX.API_KEY), secretSchema),
    baseUrl: readValid(readEnvValue(credentialsKey, SECRET_SUFFIX.BASE_URL), baseUrlSchema),
    webhookSecret: readValid(
      readEnvValue(credentialsKey, SECRET_SUFFIX.WEBHOOK_SECRET),
      secretSchema,
    ),
    previousWebhookSecret: readValid(
      readEnvValue(credentialsKey, SECRET_SUFFIX.PREVIOUS_WEBHOOK_SECRET),
      secretSchema,
    ),
  };
};
