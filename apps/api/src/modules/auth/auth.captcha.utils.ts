import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = { success: boolean };

export const verifyCaptcha = async (
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> => {
  if (!env.CAPTCHA_ENABLED) return true;
  if (!token) return false;

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });

    if (!response.ok) {
      logger.warn(`Captcha verification returned status ${response.status}; failing closed`);
      return false;
    }

    const body = (await response.json()) as TurnstileVerifyResponse;
    return body.success === true;
  } catch (error) {
    logger.warn(`Captcha verification errored, failing closed: ${describeError(error)}`);
    return false;
  }
};
