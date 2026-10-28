import { PostHog } from "posthog-node";

import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

export type PosthogServerEvent = {
  distinctId: string;
  event: string;
  properties: Record<string, unknown>;
  uuid?: string;
};

let posthogClient: PostHog | null = null;

const getPosthogClient = (): PostHog | null => {
  if (!env.POSTHOG_PROJECT_TOKEN) return null;
  posthogClient ??= new PostHog(env.POSTHOG_PROJECT_TOKEN, { host: env.POSTHOG_HOST });
  return posthogClient;
};

export const sendToPosthog = (serverEvent: PosthogServerEvent): void => {
  const client = getPosthogClient();
  if (!client) return;

  try {
    client.capture({ ...serverEvent, disableGeoip: true });
  } catch (error) {
    logger.warn(`Product analytics event ${serverEvent.event} not sent: ${describeError(error)}`);
  }
};

export const flushProductAnalytics = async (): Promise<void> => {
  if (!posthogClient) return;
  const closingClient = posthogClient;
  posthogClient = null;
  await closingClient.shutdown();
};
