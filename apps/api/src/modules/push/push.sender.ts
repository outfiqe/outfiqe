import webpush, { WebPushError } from "web-push";

import { env } from "#config/env.config.js";

import { PUSH_MESSAGE_TIME_TO_LIVE_SECONDS } from "./push.constants.js";
import type { PushMessage } from "./push.messages.js";

const GONE_STATUS_CODES = new Set([404, 410]);

let hasConfiguredVapid = false;

export const isPushConfigured = (): boolean =>
  Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

const ensureVapidConfigured = (): void => {
  if (hasConfiguredVapid || !isPushConfigured()) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  hasConfiguredVapid = true;
};

type PushEndpoint = { endpoint: string; p256dhKey: string; authKey: string };

export type PushSendOutcome = { delivered: boolean; subscriptionIsGone: boolean };

export const sendPushMessage = async (
  target: PushEndpoint,
  message: PushMessage,
): Promise<PushSendOutcome> => {
  ensureVapidConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dhKey, auth: target.authKey },
      },
      JSON.stringify(message),
      { TTL: PUSH_MESSAGE_TIME_TO_LIVE_SECONDS },
    );
    return { delivered: true, subscriptionIsGone: false };
  } catch (error) {
    const subscriptionIsGone =
      error instanceof WebPushError && GONE_STATUS_CODES.has(error.statusCode);
    return { delivered: false, subscriptionIsGone };
  }
};
